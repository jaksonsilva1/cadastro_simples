const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// ========== BANCO DE DADOS ==========
const db = new sqlite3.Database(path.join(__dirname, 'instance', 'cadastro.db'));

// Criar tabela de veículos
db.run(`
    CREATE TABLE IF NOT EXISTS veiculos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modelo TEXT NOT NULL,
        marca TEXT NOT NULL,
        ano INTEGER NOT NULL,
        placa TEXT UNIQUE NOT NULL,
        cor TEXT,
        data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Criar tabela de pagamentos
db.run(`
    CREATE TABLE IF NOT EXISTS pagamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        veiculo_id INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        data_pagamento DATE NOT NULL,
        forma_pagamento TEXT,
        observacao TEXT,
        data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE
    )
`);

// ========== ROTAS ==========

// Rota para o painel administrativo
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Rota para a página de consulta
app.get('/consulta', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'consulta.html'));
});

// API: Consultar veículo por placa
app.get('/api/consulta/:placa', (req, res) => {
    const placa = req.params.placa.toUpperCase().trim();
    
    if (!placa) {
        return res.status(400).json({ error: 'Placa não informada' });
    }
    
    db.get('SELECT * FROM veiculos WHERE placa = ?', [placa], (err, veiculo) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar veículo' });
        }
        
        if (!veiculo) {
            return res.status(404).json({ error: 'Veículo não encontrado' });
        }
        
        db.all(`
            SELECT * FROM pagamentos 
            WHERE veiculo_id = ? 
            ORDER BY data_pagamento DESC
        `, [veiculo.id], (err, pagamentos) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao buscar pagamentos' });
            }
            
            res.json({
                veiculo: veiculo,
                pagamentos: pagamentos
            });
        });
    });
});

// API: Listar todos os veículos
app.get('/api/veiculos', (req, res) => {
    db.all('SELECT * FROM veiculos ORDER BY data_cadastro DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Rota: Cadastrar veículo
app.post('/cadastrar-veiculo', (req, res) => {
    const { modelo, marca, ano, placa, cor } = req.body;
    if (!modelo || !marca || !ano || !placa) return res.redirect('/?msg=erro');
    
    const placaUpper = placa.toUpperCase().trim();
    db.run('INSERT INTO veiculos (modelo, marca, ano, placa, cor) VALUES (?, ?, ?, ?, ?)',
        [modelo, marca, ano, placaUpper, cor],
        (err) => {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.redirect('/?msg=duplicado');
                return res.redirect('/?msg=erro');
            }
            res.redirect('/?msg=ok');
        }
    );
});

// API: Excluir veículo
app.delete('/api/excluir-veiculo/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM veiculos WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (this.changes === 0) return res.status(404).json({ success: false, message: 'Veículo não encontrado' });
        res.json({ success: true, message: 'Veículo excluído com sucesso!' });
    });
});

// API: Listar todos os pagamentos
app.get('/api/pagamentos', (req, res) => {
    db.all(`
        SELECT p.*, v.placa, v.modelo, v.marca 
        FROM pagamentos p
        JOIN veiculos v ON p.veiculo_id = v.id
        ORDER BY p.data_pagamento DESC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Rota: Cadastrar pagamento
app.post('/cadastrar-pagamento', (req, res) => {
    const { veiculo_id, descricao, valor, data_pagamento, forma_pagamento, observacao } = req.body;
    if (!veiculo_id || !descricao || !valor || !data_pagamento) {
        return res.redirect('/?msg=erro');
    }
    
    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) return res.redirect('/?msg=erro');
    
    db.run(`
        INSERT INTO pagamentos (veiculo_id, descricao, valor, data_pagamento, forma_pagamento, observacao)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [veiculo_id, descricao, valorNum, data_pagamento, forma_pagamento, observacao],
    (err) => {
        if (err) return res.redirect('/?msg=erro');
        res.redirect('/?msg=ok');
    });
});

// API: Excluir pagamento
app.delete('/api/excluir-pagamento/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM pagamentos WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (this.changes === 0) return res.status(404).json({ success: false, message: 'Pagamento não encontrado' });
        res.json({ success: true, message: 'Pagamento excluído com sucesso!' });
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`🔍 Página de consulta: http://localhost:${PORT}/consulta`);
    console.log(`🛠️  Painel administrativo: http://localhost:${PORT}`);
});