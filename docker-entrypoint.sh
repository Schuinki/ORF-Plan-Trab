#!/bin/sh
set -e

echo "🔄 Aguardando banco de dados..."
sleep 5

echo "🔄 Executando migrations do Prisma..."
node node_modules/prisma/build/index.js migrate deploy

echo "✅ Migrations concluídas!"

# Primeiro boot em um banco vazio: popula dados iniciais (OMs, naturezas de
# despesa, usuário admin). O seed é destrutivo (apaga e recria), por isso só
# roda quando não existe nenhum usuário ainda — nunca em boots subsequentes.
if [ "$AUTO_SEED" = "true" ]; then
  echo "🔎 Verificando se o banco precisa de dados iniciais..."
  USER_COUNT=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.user.count()
      .then((c) => { console.log(c); return prisma.\$disconnect(); })
      .catch((e) => { console.error(e); process.exit(1); });
  " | tail -n 1)

  if [ "$USER_COUNT" = "0" ]; then
    echo "🌱 Banco vazio: executando seed inicial..."
    node_modules/.bin/tsx prisma/seed.ts
  else
    echo "ℹ️  Banco já populado ($USER_COUNT usuário(s)), seed ignorado."
  fi
fi

echo "🚀 Iniciando aplicação..."

exec node server.js
