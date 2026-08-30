import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { Library2LessonExperience } from "@/components/Library2LessonExperience";
import { lessons } from "@/domain/seed";

type Library2LessonPageProps = { lessonId: string };

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: lessons.map((lesson) => ({ params: { lessonId: lesson.id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Library2LessonPageProps> = async ({ params }) => {
  const lessonId = typeof params?.lessonId === "string" ? params.lessonId : undefined;
  if (!lessonId || !lessons.some((lesson) => lesson.id === lessonId)) return { notFound: true };
  return { props: { lessonId } };
};

export default function Library2LessonPage({ lessonId }: InferGetStaticPropsType<typeof getStaticProps>) {
  return <Library2LessonExperience initialLessonId={lessonId} />;
}
