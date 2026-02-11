/**
 * Interfaces for MCQ question data structures.
 */

import { PropositionChoiceValue } from '../constants/test-codes.constant';

/** A single MCQ proposition as returned to the candidate (without correct answer). */
export interface McqPropositionView {
  id: string;
  displayOrder: number;
  text: string;
}

/** A single MCQ proposition response from the candidate. */
export interface McqPropositionResponseInput {
  propositionId: string;
  selectedChoice: PropositionChoiceValue | null;
}

/** Candidate's answer for an MCQ question. */
export interface McqAnswer {
  propositionResponses: McqPropositionResponseInput[];
}
