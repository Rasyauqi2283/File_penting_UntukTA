import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const staticConfig = (app) => {
    app.use(express.static(path.join(__dirname, "public")));
    app.use('/pdf', express.static(path.join(__dirname, 'public', 'folder_input_sspd', 'pdf')));
    app.use('/images', express.static(path.join(__dirname, 'public', 'folder_input_sspd', 'images')));
    app.use('/file_paraf', express.static('public/file_paraf'));
    app.use('/libs', express.static(path.join(__dirname, 'Peneliti/ParafKasie-sspd/libs')));
};