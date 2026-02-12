import { neon } from '@neondatabase/serverless';

export default function Page() {
  async function create(formData: FormData) {
    'use server';
    const sql = neon(process.env.DATABASE_URL!);
    const comment = formData.get('comment');
    if (!comment || typeof comment !== 'string') return;
    await sql`INSERT INTO comments (comment) VALUES (${comment})`;
  }

  return (
    <form action={create} style={{ padding: 24, display: 'grid', gap: 12 }}>
      <input type="text" placeholder="write a comment" name="comment" />
      <button type="submit">Submit</button>
    </form>
  );
}
