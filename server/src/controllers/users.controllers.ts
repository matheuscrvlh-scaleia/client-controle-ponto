import type { FastifyRequest, FastifyReply } from "fastify";
import { UserBody } from "../types/users.types";
import { insertUser, search } from "../models/users.models";

export async function createUser(req:FastifyRequest<{Body: UserBody}>, res:FastifyReply) {
    const { nome, email, senha, ativo } = req.body

    try {
        const fieldsToCheck: [string, string | number | null][] = [
            ['nome', nome],
            ['email', email],
        ]

        for(const [column, value] of fieldsToCheck) {
            if(value === undefined) continue

            const existing = await search(column, value)
            if(existing.rows.length >= 1) {
                res.code(409).send({ error: `Usuário ${column}: ${value} já cadastrado(a).`})
            }
        }

        const result = await insertUser({ nome, email, senha, ativo })
        if(!result.rows[0].id) {
            console.error('Erro ao inserir usuário.');
            return
        }

        res.code(201).send({ success: `Usuário ${nome} cadastrado(a).`})
    } catch(err) {
        console.error(err);
        res.code(500).send({ error: 'Erro interno do servidor.' })
    }
}