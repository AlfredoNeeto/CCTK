import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nomeDoArquivo } from './index.js';

const s3 = new S3Client({
  region: 'sa-east-1',
  credentials: { accessKeyId: '__CANARY__', secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
});

export async function salvarComprovante(pedidoId, pdf) {
  await s3.send(new PutObjectCommand({ Bucket: 'comprovantes', Key: nomeDoArquivo(pedidoId, 'pdf'), Body: pdf }));
}
