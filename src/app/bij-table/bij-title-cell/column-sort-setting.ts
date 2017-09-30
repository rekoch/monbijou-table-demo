import { SortDirection } from './sort-direction.enum';

// TODO discuss naming, rename instances as well
export interface ColumnSortSetting {
  direction: SortDirection;
  multi: boolean;
}
