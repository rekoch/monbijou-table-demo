import { SortDirection } from './sort-direction.enum';

export interface ColumnSortCriterion {
  direction: SortDirection;
  multi: boolean;
}
