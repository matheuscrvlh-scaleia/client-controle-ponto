import { db } from "../db/database";
import { UserBody } from "../types/users.types";

export async function search(column: string, data: string | number | null) {
    const result = await db.query(`
        SELECT id FROM usuarios WHERE ${column} = $1
    `,[data]) 

    return result
}

export async function insertUser(data:UserBody) {
    const { nome, email, senha, ativo } = data

    const result = await db.query(`
        INSERT INTO usuarios
        (nome, email, senha, ativo)
        VALUES
        ($1, $2, $3, $4)
        RETURNING id
    `,[nome, email, senha, ativo || null])

    return result
}