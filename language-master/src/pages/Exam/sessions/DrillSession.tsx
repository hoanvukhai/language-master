import ExamWorkspace from "../ExamWorkspace";
import { Navigate, useParams } from "react-router-dom";
import { getExamById } from "../../../data/exams/jlpt";
import { poolId } from "../../../lib/jlpt/practicePool";
import { getSession } from "../../../lib/jlpt/tabSession";
export default function DrillSession() {
  const { examId } = useParams();
  const attempt = getSession();
  const resumingScopedDrill =
    attempt?.mode === "drill" && attempt.exam.id === examId;
  if (examId && !examId.startsWith("pool-") && !resumingScopedDrill) {
    const exam = getExamById(examId);
    if (exam)
      return (
        <Navigate
          replace
          to={`/exams/jlpt/${poolId(exam.bookId || exam.id, exam.level)}/drill${exam.day ? `?day=${exam.day}` : ""}`}
        />
      );
  }
  return <ExamWorkspace mode="drill" />;
}
