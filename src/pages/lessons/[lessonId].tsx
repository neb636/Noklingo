import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import ErrorPage from "next/error";
import { LessonExperience } from "@/components/LessonExperience";
import { lessons } from "@/domain/seed";

type LessonPageProps = {
  lessonId: string;
};

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: lessons.map((lesson) => ({ params: { lessonId: lesson.id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<LessonPageProps> = async ({ params }) => {
  const lessonId = typeof params?.lessonId === "string" ? params.lessonId : undefined;
  if (!lessonId || !lessons.some((lesson) => lesson.id === lessonId)) return { notFound: true };
  return { props: { lessonId } };
};

export default function LessonPage({ lessonId }: InferGetStaticPropsType<typeof getStaticProps>) {
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) return <ErrorPage statusCode={404} />;
  return <LessonExperience lesson={lesson} />;
}
