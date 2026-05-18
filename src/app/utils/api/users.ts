import { User } from '../../types';
import { mapArray, requireClient, toCamel } from './helpers';

// The DB column `password_hash` never travels to the frontend. The TS `User`
// type carries a `password` field only because the old localStorage-based
// storage stored it inline; we strip it from anything we write here.
const USER_FIELDS = 'id, username, role, full_name, email, phone, active, created_at';

export async function getAll(): Promise<User[]> {
  const client = requireClient();
  const { data, error } = await client.from('users').select(USER_FIELDS).order('created_at');
  if (error) throw error;
  return mapArray<User>(data as never).map((u) => ({ ...u, password: '' } as User));
}

// Updates (or sets for the first time) a user's password hash. The DB function
// `set_user_password` runs as SECURITY DEFINER and hashes the plaintext with
// bcrypt before writing.
export async function upsertPassword(userId: string, plainPassword: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('set_user_password', {
    p_user_id: userId,
    p_password: plainPassword,
  });
  if (error) throw error;
}

// Insert a user row. If `plainPassword` is provided we follow the insert with
// a `set_user_password` RPC call so the row ends up with a real bcrypt hash.
// Passing no password creates the row with an empty (non-loginable) hash —
// callers must then call `upsertPassword` themselves when they're ready.
export async function insert(user: User, plainPassword?: string): Promise<void> {
  const client = requireClient();
  const payload: Record<string, unknown> = {
    id: user.id,
    username: user.username,
    role: user.role,
    full_name: user.fullName,
    email: user.email ?? null,
    phone: user.phone ?? null,
    active: user.active,
    created_at: user.createdAt,
    // Placeholder hash so the NOT NULL constraint is satisfied. It cannot be
    // used to log in (bcrypt of empty string would not match anything via
    // `verify_user`, and we'll immediately overwrite it below).
    password_hash: 'pending',
  };

  const { error } = await client.from('users').insert(payload);
  if (error) throw error;

  if (plainPassword) {
    await upsertPassword(user.id, plainPassword);
  }
}

export async function update(userId: string, updates: Partial<User>): Promise<void> {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  if (updates.username !== undefined) payload.username = updates.username;
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.fullName !== undefined) payload.full_name = updates.fullName;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.active !== undefined) payload.active = updates.active;

  if (Object.keys(payload).length === 0) return;

  const { error } = await client.from('users').update(payload).eq('id', userId);
  if (error) throw error;
}

export async function verify(username: string, password: string): Promise<User | null> {
  const client = requireClient();
  const { data, error } = await client.rpc('verify_user', {
    p_username: username,
    p_password: password,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const user = toCamel<User>(row);
  return user ? ({ ...user, password: '' } as User) : null;
}
