import { Client } from '@notionhq/client';
import { unstable_cache } from 'next/cache';
import type { Course, Topic, Lesson, NotionProject } from '@/types';
import { blocksToHtml, richTextToHtml } from './blocks';
import { makeRouteSlug } from '@/lib/utils';

const REVALIDATE_TIME = parseInt(process.env.REVALIDATE_TIME || '60', 10);

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const COURSES_DB  = process.env.NOTION_COURSES_DB_ID!;
const TOPICS_DB   = process.env.NOTION_TOPICS_DB_ID!;
const LESSONS_DB  = process.env.NOTION_LESSONS_DB_ID!;
const PROJECTS_DB = process.env.NOTION_PROJECTS_DB_ID ?? '';

// ─── Field extractors ─────────────────────────────────────────────────────────

function getText(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'title' && Array.isArray(p.title))
    return (p.title as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  if (p.type === 'rich_text' && Array.isArray(p.rich_text))
    return (p.rich_text as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  if (p.type === 'url')
    return (p as Record<string, unknown>).url as string ?? '';
  return '';
}

function getCheckbox(prop: unknown): boolean {
  if (!prop || typeof prop !== 'object') return false;
  const p = prop as Record<string, unknown>;
  return p.type === 'checkbox' ? Boolean(p.checkbox) : false;
}

function getNumber(prop: unknown): number {
  if (!prop || typeof prop !== 'object') return 0;
  const p = prop as Record<string, unknown>;
  return p.type === 'number' ? Number(p.number ?? 0) : 0;
}

function getSelect(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'select' && p.select && typeof p.select === 'object') {
    return (p.select as { name?: string }).name ?? '';
  }
  return '';
}

function getRelationIds(prop: unknown): string[] {
  if (!prop || typeof prop !== 'object') return [];
  const p = prop as Record<string, unknown>;
  if (p.type === 'relation' && Array.isArray(p.relation))
    return (p.relation as Array<{ id: string }>).map(r => r.id);
  return [];
}

function getRichTextArray(prop: unknown): Array<{ plain_text: string; href?: string | null; annotations?: Record<string, unknown> }> {
  if (!prop || typeof prop !== 'object') return [];
  const p = prop as Record<string, unknown>;
  if (p.type === 'rich_text' && Array.isArray(p.rich_text)) {
    return p.rich_text as Array<{ plain_text: string; href?: string | null; annotations?: Record<string, unknown> }>;
  }
  return [];
}

// ─── Page block fetching (cached) ─────────────────────────────────────────────

const _getPageHtml = unstable_cache(
  async (pageId: string): Promise<string> => {
    try {
      const { results } = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return blocksToHtml(results as any[]);
    } catch {
      return '';
    }
  },
  ['notion-page-html'],
  { revalidate: REVALIDATE_TIME }
);

export async function getPageHtml(pageId: string): Promise<string> {
  return _getPageHtml(pageId);
}

// ─── Courses (cached) ─────────────────────────────────────────────────────────

const _getCourses = unstable_cache(
  async (includeAll: boolean): Promise<Course[]> => {
    const query: Parameters<typeof notion.dataSources.query>[0] = {
      data_source_id: COURSES_DB,
    };
    if (!includeAll) {
      query.filter = { property: 'Status', select: { equals: 'Published' } };
    }
    const response = await notion.dataSources.query(query);

    return (response.results as unknown as Array<{ id: string; object: string; properties: Record<string, unknown> }>)
      .filter(p => p.object === 'page')
      .map(page => {
        const props = page.properties;
        const title = getText(props['Name']);
        const explicitSlug = getText(props['Slug']);
        return {
          id: page.id,
          title,
          slug: makeRouteSlug(explicitSlug || title, page.id),
          status: 'Published' as const,
          access_type: (getSelect(props['Access_Type']) || 'Public') as Course['access_type'],
          cover_image: getText(props['Cover_Image']) || null,
        };
      });
  },
  ['notion-courses'],
  { revalidate: REVALIDATE_TIME }
);

export async function getCourses(includeAll = false): Promise<Course[]> {
  return _getCourses(includeAll);
}

// ─── Topics (cached per course) ───────────────────────────────────────────────

const _getTopicsByCourse = unstable_cache(
  async (courseId: string): Promise<Topic[]> => {
    const response = await notion.dataSources.query({
      data_source_id: TOPICS_DB,
      filter: { property: '🎓 Courses', relation: { contains: courseId } },
      sorts: [{ property: 'Order', direction: 'ascending' }],
    });

    return (response.results as unknown as Array<{ id: string; object: string; properties: Record<string, unknown> }>)
      .filter(p => p.object === 'page')
      .map(page => {
        const props = page.properties;
        const title = getText(props['Name']);
        const explicitSlug = getText(props['Slug']);
        return {
          id: page.id,
          title,
          slug: makeRouteSlug(explicitSlug || title, page.id),
          course_id: courseId,
          has_project: getCheckbox(props['Has_Project']),
          project_max_size_mb: getNumber(props['Project_Max_Size_MB']) || 5,
          allowed_extensions: getText(props['Allowed_Extensions']),
          order: getNumber(props['Order']),
          is_bounty_project: getCheckbox(props['Is_Bounty_Project']),
          bounty_sponsor_name: getText(props['Bounty_Sponsor_Name']),
          bounty_sponsor_logo: getText(props['Bounty_Sponsor_Logo']) || null,
          bounty_prize: getNumber(props['Bounty_Prize']),
        };
      });
  },
  ['notion-topics'],
  { revalidate: REVALIDATE_TIME }
);

export async function getTopicsByCourse(courseId: string): Promise<Topic[]> {
  return _getTopicsByCourse(courseId);
}

// ─── Lessons (cached per topic) ───────────────────────────────────────────────

const _getLessonsByTopic = unstable_cache(
  async (topicId: string): Promise<Lesson[]> => {
    const response = await notion.dataSources.query({
      data_source_id: LESSONS_DB,
      filter: { property: '🎓 Topics', relation: { contains: topicId } },
      sorts: [{ property: 'Order', direction: 'ascending' }],
    });

    return (response.results as unknown as Array<{ id: string; object: string; properties: Record<string, unknown> }>)
      .filter(p => p.object === 'page')
      .map(page => {
        const props = page.properties;
        const title = getText(props['Name']);
        const explicitSlug = getText(props['Slug']);
        return {
          id: page.id,
          title,
          slug: makeRouteSlug(explicitSlug || title, page.id),
          topic_id: topicId,
          order: getNumber(props['Order']),
          content: getText(props['Content']),
          html_content: '',
          has_quiz: getCheckbox(props['Has_Quiz']),
          quiz_content: getText(props['Quiz_Content']),
        };
      });
  },
  ['notion-lessons'],
  { revalidate: REVALIDATE_TIME }
);

export async function getLessonsByTopic(topicId: string): Promise<Lesson[]> {
  return _getLessonsByTopic(topicId);
}

const _getLessonById = unstable_cache(
  async (lessonId: string): Promise<Lesson | null> => {
    try {
      const page = await notion.pages.retrieve({ page_id: lessonId }) as unknown as {
        id: string;
        properties: Record<string, unknown>;
      };
      const props = page.properties;
      const topicIds = getRelationIds(props['🎓 Topics']);
      const title = getText(props['Name']);
      const explicitSlug = getText(props['Slug']);
      const html_content = await getPageHtml(lessonId);
      const richTextArray = getRichTextArray(props['Content']);
      const content = richTextArray.length > 0
        ? richTextToHtml(richTextArray)
        : getText(props['Content']);

      return {
        id: page.id,
        title,
        slug: makeRouteSlug(explicitSlug || title, page.id),
        topic_id: topicIds[0] ?? '',
        order: getNumber(props['Order']),
        content,
        html_content,
        has_quiz: getCheckbox(props['Has_Quiz']),
        quiz_content: getText(props['Quiz_Content']),
      };
    } catch {
      return null;
    }
  },
  ['notion-lesson'],
  { revalidate: REVALIDATE_TIME }
);

export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  return _getLessonById(lessonId);
}

// ─── Slug-based lookups (for hierarchical URLs) ───────────────────────────────

/**
 * Find a lesson by (courseSlug, lessonSlug).
 * Scans topics for the course in parallel, returns full lesson with HTML.
 */
export async function getLessonBySlug(
  courseSlug: string,
  lessonSlug: string
): Promise<Lesson | null> {
  const courses = await getCourses();
  const course = courses.find(c => c.slug === courseSlug);
  if (!course) return null;

  const topics = await getTopicsByCourse(course.id);

  // Fetch all topic lessons in parallel and find by slug
  const allLessonLists = await Promise.all(topics.map(t => getLessonsByTopic(t.id)));
  const matchedLesson = allLessonLists.flat().find(l => l.slug === lessonSlug);
  if (!matchedLesson) return null;

  // Fetch full content
  return getLessonById(matchedLesson.id);
}

/**
 * Compute the URL of the next lesson in the course sequence.
 * Returns null if the current lesson is the last one.
 */
export async function getNextLessonUrl(
  courseSlug: string,
  currentLesson: Lesson
): Promise<string | null> {
  const courses = await getCourses();
  const course = courses.find(c => c.slug === courseSlug);
  if (!course) return null;

  const topics = await getTopicsByCourse(course.id);

  // Find current topic index
  const topicIdx = topics.findIndex(t => t.id === currentLesson.topic_id);
  if (topicIdx === -1) return null;

  // Get lessons for current topic
  const currentTopicLessons = await getLessonsByTopic(currentLesson.topic_id);
  currentTopicLessons.sort((a, b) => a.order - b.order);
  const lessonIdx = currentTopicLessons.findIndex(l => l.id === currentLesson.id);

  // Next lesson in same topic
  if (lessonIdx !== -1 && lessonIdx < currentTopicLessons.length - 1) {
    const next = currentTopicLessons[lessonIdx + 1];
    return `/course/${courseSlug}/lesson/${next.slug}`;
  }

  // First lesson of the next topic that has lessons
  for (let i = topicIdx + 1; i < topics.length; i++) {
    const nextTopicLessons = await getLessonsByTopic(topics[i].id);
    nextTopicLessons.sort((a, b) => a.order - b.order);
    if (nextTopicLessons.length > 0) {
      return `/course/${courseSlug}/lesson/${nextTopicLessons[0].slug}`;
    }
  }

  return null; // last lesson of the course
}

// ─── Projects (cached per course) ─────────────────────────────────────────────

export async function getProjectsByCourse(courseId: string): Promise<NotionProject[]> {
  if (!PROJECTS_DB) return [];
  try {
    const response = await notion.dataSources.query({
      data_source_id: PROJECTS_DB,
      filter: { property: '🎓 Courses', relation: { contains: courseId } },
    });

    const pages = response.results as unknown as Array<{
      id: string; object: string; properties: Record<string, unknown>;
    }>;

    return await Promise.all(
      pages.filter(p => p.object === 'page').map(async (page) => {
        const props = page.properties;
        const title = getText(props['Title'] ?? props['Name']);
        const explicitSlug = getText(props['Slug']);
        const html_content = await getPageHtml(page.id);
        return {
          id: page.id,
          title,
          slug: makeRouteSlug(explicitSlug || title, page.id),
          course_id: courseId,
          project_max_size_mb: getNumber(props['Project_Max_Size_MB']) || 5,
          allowed_extensions: getText(props['Allowed_Extensions']),
          is_bounty: getCheckbox(props['Is_Bounty']),
          bounty_prize: getNumber(props['Bounty_Prize']),
          bounty_sponsor_name: getText(props['Bounty_Sponsor_Name']),
          html_content,
        };
      })
    );
  } catch {
    return [];
  }
}

// ─── Enriched search (returns full hierarchical URL per result) ───────────────

export interface SearchResult {
  id: string;
  title: string;
  topic_id: string;
  lesson_slug: string;
  course_slug: string;
  url: string;
}

export async function searchLessons(query: string): Promise<SearchResult[]> {
  try {
    const [searchResponse, courses] = await Promise.all([
      notion.search({
        query,
        filter: { property: 'object', value: 'page' },
        page_size: 20,
      }),
      getCourses(),
    ]);

    // Raw lessons from search
    const rawLessons = (searchResponse.results as unknown as Array<{
      id: string; object: string; properties: Record<string, unknown>;
    }>)
      .filter(p => p.object === 'page')
      .map(page => ({
        id: page.id,
        title: getText(page.properties['Name']),
        topic_id: getRelationIds(page.properties['🎓 Topics'])[0] ?? '',
      }))
      .filter(l => l.title && l.topic_id);

    // Build topicId → course map in parallel
    const topicToCourse = new Map<string, Course>();
    await Promise.all(
      courses.map(async (course) => {
        const topics = await getTopicsByCourse(course.id);
        for (const topic of topics) topicToCourse.set(topic.id, course);
      })
    );

    return rawLessons
      .map(lesson => {
        const course = topicToCourse.get(lesson.topic_id);
        if (!course) return null;
        const lesson_slug = makeRouteSlug(lesson.title, lesson.id);
        return {
          id: lesson.id,
          title: lesson.title,
          topic_id: lesson.topic_id,
          lesson_slug,
          course_slug: course.slug,
          url: `/course/${course.slug}/lesson/${lesson_slug}`,
        };
      })
      .filter((r): r is SearchResult => r !== null);
  } catch {
    return [];
  }
}

