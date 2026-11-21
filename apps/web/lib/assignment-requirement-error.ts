import { AppError } from "./auth";
import type { AssignmentIssue } from "../../../packages/business-rules/src/assignment-requirements";

export class AssignmentRequirementError extends AppError {
  constructor(public issues: AssignmentIssue[]) {
    const first = issues[0];
    super(409, `${first.title}. ${first.resolution}`, first.code);
  }
}
