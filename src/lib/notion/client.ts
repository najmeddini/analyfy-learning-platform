import { Client } from '@notionhq/client';
import type { Course, Topic, Lesson, NotionProject } from '@/types';
import { blocksToHtml, richTextToHtml } from './blocks';
import { makeRouteSlug } from '@/lib/utils';

export const revalidate = parseInt(process.env.REVALIDATE_TIME || '3600', 10);

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const COURSES_DB  = process.env.NOTION_COURSES_DB_ID!;
const TOPICS_DB   = process.env.NOTION_TOPICS_DB_ID!;
const LESSONS_DB  = process.env.NOTION_LESSONS_DB_ID!;
const PROJECTS_DB = process.env.NOTION_PROJECTS_DB_ID ?? ''; // optional

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

/** Get rich_text items as a typed array for blocksToHtml */
function getRichTextArray(prop: unknown): Array<{ plain_text: string; href?: string | null; annotations?: Record<string, unknown> }> {
  if (!prop || typeof prop !== 'object') return [];
  const p = prop as Record<string, unknown>;
  if (p.type === 'rich_text' && Array.isArray(p.rich_text)) {
    return p.rich_text as Array<{ plain_text: string; href?: string | null; annotations?: Record<string, unknown> }>;
  }
  return [];
}

// makeRouteSlug is imported from utils — used throughout to build hierarchical URL slugs

// ─── Page block fetching ──────────────────────────────────────────────────────

export async function getPageHtml(pageId: string): Promise<string> {
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
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export async function getCourses(includeAll = false): Promise<Course[]> {
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
        // Always use makeRouteSlug so the ID is always resolvable from the URL.
        // If Notion has an explicit Slug, use it as the title part; else auto-generate.
        slug: makeRouteSlug(explicitSlug || title, page.id),
        status: 'Published' as const,
        access_type: (getSelect(props['Access_Type']) || 'Public') as Course['access_type'],
        cover_image: getText(props['Cover_Image']) || null,
      };
    });
}

// ─── Topics ──────────────────────────────────────────────────────────────────

export async function getTopicsByCourse(courseId: string): Promise<Topic[]> {
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
}

// ─── Lessons ─────────────────────────────────────────────────────────────────

export async function getLessonsByTopic(topicId: string): Promise<Lesson[]> {
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
        html_content: '',    // fetched separately on detail view
        has_quiz: getCheckbox(props['Has_Quiz']),
        quiz_content: getText(props['Quiz_Content']),
      };
    });
}

export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: lessonId }) as unknown as {
      id: string;
      properties: Record<string, unknown>;
    };
    const props = page.properties;
    const topicIds = getRelationIds(props['🎓 Topics']);
    const title = getText(props['Name']);
    const explicitSlug = getText(props['Slug']);

    // Fetch page body blocks for rich HTML content
    const html_content = await getPageHtml(lessonId);

    // Build content fallback from rich_text if blocks are empty
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
}

// ─── Projects DB (optional — requires NOTION_PROJECTS_DB_ID) ─────────────────

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

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchLessons(query: string): Promise<Array<{ id: string; title: string; topic_id: string }>> {
  try {
    const response = await notion.search({
      query,
      filter: { property: 'object', value: 'page' },
      page_size: 20,
    });

    return (response.results as unknown as Array<{
      id: string; object: string; properties: Record<string, unknown>;
    }>)
      .filter(p => p.object === 'page')
      .map(page => ({
        id: page.id,
        title: getText(page.properties['Name']),
        topic_id: getRelationIds(page.properties['🎓 Topics'])[0] ?? '',
      }))
      .filter(l => l.title && l.topic_id); // only lessons (have a Topics relation)
  } catch {
    return [];
  }
}
