import * as users from './users';
import * as locations from './locations';
import * as residents from './residents';
import * as visitors from './visitors';
import * as checkpoints from './checkpoints';
import * as patrolRounds from './patrolRounds';

export { users, locations, residents, visitors, checkpoints, patrolRounds };
export { isNotConfiguredError } from './helpers';
export { rowToVisitor } from './visitors';
export { rowToRound } from './patrolRounds';

export type EntityName =
  | 'users'
  | 'locations'
  | 'residents'
  | 'visitors'
  | 'checkpoints'
  | 'patrolRounds';
