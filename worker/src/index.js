/**
 * Cloudflare Worker — Proxy para o Webhook do n8n
 *
 * Este worker recebe o POST do formulario e repassa para o webhook real.
 * Assim, a URL do webhook nunca e exposta no navegador do usuario.
 */

// Dominios autorizados a enviar requisicoes (CORS)
// Adicione aqui o dominio onde o formulario esta hospedado.
// Use "*" apenas em desenvolvimento.
const ALLOWED_ORIGINS = [
    "https://agendamento.smartcases.com.br"
];

function isOriginAllowed(origin) {
    if (ALLOWED_ORIGINS.includes("*")) return true;
    return ALLOWED_ORIGINS.includes(origin);
}

function corsHeaders(origin) {
    return {
        "Access-Control-Allow-Origin": isOriginAllowed(origin) ? origin : "",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
    };
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get("Origin") || "";

        // Responde preflight CORS
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(origin),
            });
        }

        // Aceita apenas POST
        if (request.method !== "POST") {
            return new Response(
                JSON.stringify({ error: "Metodo nao permitido" }),
                {
                    status: 405,
                    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
                }
            );
        }

        try {
            // Le o body do formulario
            const body = await request.text();

            // Repassa para o webhook real (URL armazenada no servidor)
            const webhookResponse = await fetch(env.WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: body,
            });

            // Retorna a resposta do webhook para o frontend
            const responseBody = await webhookResponse.text();

            return new Response(responseBody, {
                status: webhookResponse.status,
                headers: {
                    ...corsHeaders(origin),
                    "Content-Type": "application/json",
                },
            });
        } catch (err) {
            return new Response(
                JSON.stringify({ error: "Erro interno do proxy" }),
                {
                    status: 500,
                    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
                }
            );
        }
    },
};
