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

// Criar tabela de pagamentos (débitos)
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

// Criar tabela de manutenções
db.run(`
    CREATE TABLE IF NOT EXISTS manutencoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        veiculo_id INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        pecas TEXT,
        mao_obra REAL NOT NULL,
        total REAL NOT NULL,
        data_manutencao DATE NOT NULL,
        data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE
    )
`);

// Inserir dados de exemplo (se não existirem)
db.get('SELECT COUNT(*) as count FROM veiculos', (err, row) => {
    if (err) return;
    if (row.count === 0) {
        // Inserir veículos exemplo
        const veiculosExemplo = [
            { modelo: 'Strada', marca: 'Fiat', ano: 2020, placa: 'ABC1234', cor: 'Prata' },
            { modelo: 'Civic', marca: 'Honda', ano: 2019, placa: 'DEF5678', cor: 'Preto' },
            { modelo: 'Gol', marca: 'Volkswagen', ano: 2022, placa: 'GHI9012', cor: 'Branco' },
            { modelo: 'Onix', marca: 'Chevrolet', ano: 2021, placa: 'JKL3456', cor: 'Vermelho' }
        ];

        veiculosExemplo.forEach(v => {
            db.run(
                'INSERT INTO veiculos (modelo, marca, ano, placa, cor) VALUES (?, ?, ?, ?, ?)',
                [v.modelo, v.marca, v.ano, v.placa, v.cor],
                function(err) {
                    if (err) return;
                    const veiculoId = this.lastID;

                    // Inserir débitos (pagamentos) para cada veículo
                    const pagamentosExemplo = {
                        'ABC1234': [
                            { descricao: 'IPVA 2024', valor: 1250.00, data_pagamento: '2024-03-15', forma_pagamento: 'Pendente' },
                            { descricao: 'Licenciamento Anual', valor: 185.00, data_pagamento: '2024-04-30', forma_pagamento: 'Pendente' }
                        ],
                        'DEF5678': [
                            { descricao: 'IPVA 2024 - 1ª Parcela', valor: 450.00, data_pagamento: '2024-02-10', forma_pagamento: 'Atrasado' },
                            { descricao: 'IPVA 2024 - 2ª Parcela', valor: 450.00, data_pagamento: '2024-03-10', forma_pagamento: 'Atrasado' },
                            { descricao: 'DPVAT', valor: 85.00, data_pagamento: '2024-01-20', forma_pagamento: 'Atrasado' }
                        ],
                        'GHI9012': [],
                        'JKL3456': [
                            { descricao: 'IPVA 2024', valor: 980.00, data_pagamento: '2024-05-05', forma_pagamento: 'Pendente' },
                            { descricao: 'Seguro Obrigatório', valor: 95.00, data_pagamento: '2024-06-20', forma_pagamento: 'Pendente' },
                            { descricao: 'Multa - Radar', valor: 280.00, data_pagamento: '2024-03-01', forma_pagamento: 'Atrasado' }
                        ]
                    };

                    const pagamentos = pagamentosExemplo[v.placa] || [];
                    pagamentos.forEach(p => {
                        db.run(
                            'INSERT INTO pagamentos (veiculo_id, descricao, valor, data_pagamento, forma_pagamento) VALUES (?, ?, ?, ?, ?)',
                            [veiculoId, p.descricao, p.valor, p.data_pagamento, p.forma_pagamento]
                        );
                    });

                    // Inserir manutenções
                    const manutencoesExemplo = {
                        'ABC1234': [
                            { descricao: 'Troca de óleo e filtros', pecas: 'Óleo 5W30, Filtro de óleo, Filtro de ar', mao_obra: 120.00, total: 380.00, data_manutencao: '2024-01-12' },
                            { descricao: 'Revisão dos freios', pecas: 'Pastilhas de freio dianteiras', mao_obra: 180.00, total: 320.00, data_manutencao: '2024-03-20' }
                        ],
                        'DEF5678': [
                            { descricao: 'Troca de pneus', pecas: 'Pneu Aro 17 (x4)', mao_obra: 200.00, total: 2800.00, data_manutencao: '2024-02-05' },
                            { descricao: 'Troca de óleo e filtros', pecas: 'Óleo 5W30, Filtro de óleo', mao_obra: 100.00, total: 280.00, data_manutencao: '2024-03-18' },
                            { descricao: 'Alinhamento e balanceamento', pecas: '-', mao_obra: 150.00, total: 150.00, data_manutencao: '2024-04-02' }
                        ],
                        'GHI9012': [
                            { descricao: 'Troca de óleo', pecas: 'Óleo 5W40', mao_obra: 80.00, total: 180.00, data_manutencao: '2024-01-10' },
                            { descricao: 'Revisão completa', pecas: 'Filtros, vela de ignição', mao_obra: 250.00, total: 450.00, data_manutencao: '2024-02-25' }
                        ],
                        'JKL3456': [
                            { descricao: 'Troca de óleo', pecas: 'Óleo 5W30, Filtro de óleo', mao_obra: 90.00, total: 220.00, data_manutencao: '2024-01-15' },
                            { descricao: 'Troca de pastilhas de freio', pecas: 'Pastilhas dianteiras e traseiras', mao_obra: 160.00, total: 350.00, data_manutencao: '2024-02-10' },
                            { descricao: 'Troca de bateria', pecas: 'Bateria 60Ah', mao_obra: 50.00, total: 450.00, data_manutencao: '2024-03-05' }
                        ]
                    };

                    const manutencoes = manutencoesExemplo[v.placa] || [];
                    manutencoes.forEach(m => {
                        db.run(
                            'INSERT INTO manutencoes (veiculo_id, descricao, pecas, mao_obra, total, data_manutencao) VALUES (?, ?, ?, ?, ?, ?)',
                            [veiculoId, m.descricao, m.pecas, m.mao_obra, m.total, m.data_manutencao]
                        );
                    });
                }
            );
        });
    }
});

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
        
        // Buscar pagamentos (débitos)
        db.all(`
            SELECT * FROM pagamentos 
            WHERE veiculo_id = ? 
            ORDER BY data_pagamento DESC
        `, [veiculo.id], (err, pagamentos) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao buscar pagamentos' });
            }
            
            // Buscar manutenções
            db.all(`
                SELECT * FROM manutencoes 
                WHERE veiculo_id = ? 
                ORDER BY data_manutencao DESC
            `, [veiculo.id], (err, manutencoes) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar manutenções' });
                }
                
                res.json({
                    veiculo: veiculo,
                    pagamentos: pagamentos,
                    manutencoes: manutencoes || []
                });
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

// Rota: Cadastrar manutenção (via admin)
app.post('/cadastrar-manutencao', (req, res) => {
    const { veiculo_id, descricao, pecas, mao_obra, total, data_manutencao } = req.body;
    if (!veiculo_id || !descricao || !data_manutencao) {
        return res.redirect('/?msg=erro');
    }
    
    const maoObraNum = parseFloat(mao_obra) || 0;
    const totalNum = parseFloat(total) || 0;
    
    db.run(`
        INSERT INTO manutencoes (veiculo_id, descricao, pecas, mao_obra, total, data_manutencao)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [veiculo_id, descricao, pecas, maoObraNum, totalNum, data_manutencao],
    (err) => {
        if (err) return res.redirect('/?msg=erro');
        res.redirect('/?msg=ok');
    });
});

// Adicione esta rota no server.js (já deve ter, mas vou garantir)

// Rota: Cadastrar manutenção
app.post('/cadastrar-manutencao', (req, res) => {
    const { veiculo_id, descricao, pecas, mao_obra, total, data_manutencao } = req.body;
    
    // Validação
    if (!veiculo_id || !descricao || !data_manutencao) {
        return res.redirect('/?msg=erro');
    }
    
    const maoObraNum = parseFloat(mao_obra) || 0;
    const totalNum = parseFloat(total) || 0;
    
    db.run(`
        INSERT INTO manutencoes (veiculo_id, descricao, pecas, mao_obra, total, data_manutencao)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [veiculo_id, descricao, pecas, maoObraNum, totalNum, data_manutencao],
    (err) => {
        if (err) {
            console.error('Erro ao cadastrar manutenção:', err);
            return res.redirect('/?msg=erro');
        }
        res.redirect('/?msg=ok');
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`🔍 Página de consulta: http://localhost:${PORT}/consulta`);
    console.log(`🛠️  Painel administrativo: http://localhost:${PORT}`);
});