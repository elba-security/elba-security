export const runtime = 'edge';

export async function GET() {
    const result = await fetch(
        'http://localhost:5001/refresh_token'
    );
    const data = await result.json();

    return Response.json(data);
}