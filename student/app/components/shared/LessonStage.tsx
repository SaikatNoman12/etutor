import { PlayCircle, FileText } from 'lucide-react';

/**
 * What a lesson IS, on screen.
 *
 * The player used to show a grey rectangle with a play icon for every lesson,
 * whatever it contained, because the payload carried no content. Given a URL
 * it now embeds the thing itself:
 *
 *  - a YouTube or Vimeo PAGE link becomes that site's player (the operator
 *    pastes the address from the browser bar; the embed URL is derived here,
 *    so nobody has to know the difference);
 *  - a direct .mp4 / .webm / .ogg link plays in a native <video>, which is
 *    what a phone, a keyboard and a screen reader all already know;
 *  - an article renders its text;
 *  - and a lesson with nothing yet says so, plainly, instead of pretending.
 */
export type StageLesson = {
  title?: string;
  contentType?: number;
  videoUrl?: string | null;
  content?: string | null;
};

const YT = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/;
const FILE = /\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i;

export function embedFor(url: string): { kind: 'youtube' | 'vimeo' | 'file' | 'unknown'; src: string } {
  const yt = url.match(YT);
  if (yt) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  const vm = url.match(VIMEO);
  if (vm) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vm[1]}` };
  if (FILE.test(url)) return { kind: 'file', src: url };
  return { kind: 'unknown', src: url };
}

export function LessonStage({ lesson, emptyLabel, articleLabel }: { lesson: StageLesson | null; emptyLabel: string; articleLabel: string }) {
  const url = lesson?.videoUrl?.trim() || '';
  const isArticle = lesson?.contentType === 2 && !url;
  const frame = 'aspect-video w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--c-ink)] shadow-[var(--shadow-2)]';

  if (url) {
    const e = embedFor(url);
    if (e.kind === 'youtube' || e.kind === 'vimeo') {
      return (
        <div className={frame} data-testid="lesson-stage" data-kind={e.kind}>
          <iframe
            key={e.src}
            src={e.src}
            title={lesson?.title ?? 'Lesson video'}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      );
    }
    return (
      <div className={frame} data-testid="lesson-stage" data-kind="file">
        {/* key: a <video> keeps its old source when only `src` changes; remounting
            is what makes "next lesson" actually switch the picture. */}
        <video key={e.src} src={e.src} controls playsInline preload="metadata" className="h-full w-full bg-black" data-testid="lesson-video">
          {lesson?.title}
        </video>
      </div>
    );
  }

  if (isArticle && lesson?.content) {
    return (
      <article
        className="rounded-[var(--radius-lg)] border border-[var(--c-hairline)] bg-[var(--c-surface)] p-[24px] shadow-[var(--shadow-1)] sm:p-[32px]"
        data-testid="lesson-stage"
        data-kind="article"
      >
        <p className="m-0 mb-[10px] inline-flex items-center gap-[6px] text-[12px] font-bold uppercase tracking-[1px] text-[var(--c-primary-text)]">
          <FileText className="h-[14px] w-[14px]" aria-hidden="true" />
          {articleLabel}
        </p>
        <div className="whitespace-pre-line text-[16px] leading-[1.75] text-[var(--c-body)]">{lesson.content}</div>
      </article>
    );
  }

  return (
    <div className={`${frame} flex flex-col items-center justify-center gap-[10px] text-[rgb(255_255_255/0.7)]`} data-testid="lesson-stage" data-kind="empty">
      <PlayCircle className="h-[36px] w-[36px]" aria-hidden="true" />
      <p className="m-0 text-[14px]">{emptyLabel}</p>
    </div>
  );
}

export default LessonStage;
