import Fastify from 'fastify';
import 'dotenv/config';
import { db } from './db/database';
import { userRoutes } from './routes/users.routes';

const app = Fastify();

app.register(userRoutes)

async function start() {
    await app.listen({ port: 3000 });
    console.log('Server rodando em porta 3000')

    await db.query(`SELECT NOW()`);
    console.log('Supabase conectado.')
}
start()