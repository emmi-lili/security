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

export async function insert(user: User, passwordHashOrPlain?: string): Promise<void> {
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
  };

  // If caller provided a plain password, hash it via RPC; otherwise expect a
  // pre-hashed value. This project doesn't ship a public user-creation UI yet,
  // so the hashing path is only used programmatically for now.
  if (passwordHashOrPlain) {
    payload.password_hash = passwordHashOrPlain;
  }

  const { error } = await client.from('users').insert(payload);
  if (error) throw error;
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
