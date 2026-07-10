// ============================================================
// CONFIGURAÇÕES
// ============================================================
const FEE_PER_DAY = 6.60; // Multa por dia de atraso
const MAX_FEE_DAYS = 7; // Máximo de dias de multa

let currentVehicle = null; // Dados do veículo atual
let currentPlate = ''; // Placa atual
let currentPage = 'debts'; // Página inicial: DÉBITOS

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

/** Normaliza a placa removendo espaços e hífens */
function normalizePlate(plate) {
    return plate.replace(/[\s-]/g, '').toUpperCase();
}

/** Valida o formato da placa (antigo ou Mercosul) */
function isValidPlate(plate) {
    const n = normalizePlate(plate);
    return /^[A-Z]{3}\d{4}$/.test(n) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(n);
}

/** Converte string de data YYYY-MM-DD para DD/MM/YYYY */
function formatDateToBR(dateStr) {
    if (!dateStr) return '-';
    try {
        const parts = dateStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch {
        return dateStr;
    }
}

/** Converte string de data DD/MM/AAAA para Date */
function parseDate(dateStr) {
    const parts = dateStr.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

/** Calcula quantos dias um débito está atrasado */
function calculateOverdueDays(dueDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = parseDate(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    
    // Se a data de vencimento é hoje ou futuro, não está atrasado
    if (dueDate >= today) return 0;
    
    // Calcula a diferença em dias
    const diffTime = today - dueDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Limita ao máximo de dias configurado
    return Math.min(diffDays, MAX_FEE_DAYS);
}

/** Calcula o valor total com multa, se houver atraso */
function calculateTotalWithFee(originalAmount, dueDate, status) {
    if (status !== 'Atrasado') return originalAmount;
    const daysOverdue = calculateOverdueDays(dueDate);
    if (daysOverdue === 0) return originalAmount;
    return originalAmount + (daysOverdue * FEE_PER_DAY);
}

/** Retorna detalhes da multa para exibição */
function getFeeDetail(originalAmount, dueDate, status) {
    if (status !== 'Atrasado') return null;
    const daysOverdue = calculateOverdueDays(dueDate);
    if (daysOverdue === 0) return null;
    const fee = daysOverdue * FEE_PER_DAY;
    return { days: daysOverdue, fee: fee, total: originalAmount + fee };
}

/** Formata um valor para moeda brasileira */
function formatCurrency(value) {
    return 'R$ ' + value.toFixed(2).replace('.', ',');
}

/** Retorna o rótulo do status */
function getStatusLabel(status) {
    const labels = {
        'Pendente': '⏳ Pendente',
        'Atrasado': '⚠️ Atrasado',
        'Pago': '✅ Pago'
    };
    return labels[status] || status;
}

/** Retorna a classe CSS do badge */
function getStatusBadgeClass(status) {
    const classes = {
        'Pendente': 'badge-pending',
        'Atrasado': 'badge-overdue',
        'Pago': 'badge-paid'
    };
    return classes[status] || '';
}

// ============================================================
// SIDEBAR
// ============================================================

/** Abre/fecha a sidebar */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

/** Fecha a sidebar */
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

/** Navega para uma página específica */
function navigateTo(page) {
    currentPage = page;

    // Atualiza o item ativo na sidebar
    document.querySelectorAll('.sidebar-nav-item[data-page]').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Mostra a página correspondente
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === 'page-' + page);
    });

    // FECHA A SIDEBAR EM QUALQUER DISPOSITIVO
    closeSidebar();

    // Renderiza o conteúdo da página
    if (currentVehicle) {
        renderPageContent(page);
    }
}

/** Atualiza as informações do veículo na sidebar */
function updateSidebarVehicle(vehicle, plate) {
    const modelEl = document.getElementById('sidebarVehicleModel');
    const plateEl = document.getElementById('sidebarVehiclePlate');
    const debtBadge = document.getElementById('sidebarDebtBadge');
    const maintBadge = document.getElementById('sidebarMaintenanceBadge');

    if (vehicle) {
        const vehicleName = `${vehicle.marca} ${vehicle.modelo} ${vehicle.ano}`;
        modelEl.textContent = vehicleName;
        plateEl.textContent = plate;

        // Atualiza badge de débitos (apenas pendentes e atrasados)
        const debtCount = (vehicle.pagamentos || []).filter(p => p.forma_pagamento !== 'Pago').length;
        debtBadge.textContent = debtCount;
        debtBadge.style.display = debtCount > 0 ? 'inline-block' : 'none';

        // Atualiza badge de manutenções
        const maintCount = (vehicle.manutencoes || []).length;
        maintBadge.textContent = maintCount;
        maintBadge.style.display = maintCount > 0 ? 'inline-block' : 'none';
    } else {
        modelEl.textContent = 'Nenhum veículo';
        plateEl.textContent = '---';
        debtBadge.textContent = '0';
        debtBadge.style.display = 'none';
        maintBadge.textContent = '0';
        maintBadge.style.display = 'none';
    }
}

// ============================================================
// HELP / ABOUT
// ============================================================

function showHelp() {
    showAlert(document.getElementById('dashboardAlert'),
        '💡 <strong>Como usar:</strong><br>• Digite a placa do veículo<br>• Clique em "PIX" para pagar<br>• Copie o código PIX ou use o QR Code',
        'info');
    if (window.innerWidth <= 768) closeSidebar();
}

function showAbout() {
    showAlert(document.getElementById('dashboardAlert'),
        '🚗 <strong>SuaveConsulta v2.0</strong><br>Consulte débitos veiculares de forma rápida e segura.<br><br>🔷 Dados em tempo real do banco de dados.',
        'info');
    if (window.innerWidth <= 768) closeSidebar();
}

// ============================================================
// PIX
// ============================================================

/** Gera um PIX de demonstração */
function generateDemoPix(debt, totalAmount) {
    const demoId = `DEMO_${debt.id}_${Date.now()}`;
    const demoPixString =
        `00020126360014br.gov.bcb.pix0114${demoId}@mercadopago.com5204000053039865404${totalAmount.toFixed(2).replace('.', '')}5802BR5912DETRAN-SP6008SAO PAULO62070503***6304${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const demoQrBase64 =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f0f4f8'/%3E%3Ctext x='50%25' y='45%25' text-anchor='middle' fill='%2364748b' font-size='12'%3E🔷 QR Code PIX%3C/text%3E%3Ctext x='50%25' y='60%25' text-anchor='middle' fill='%2364748b' font-size='10'%3EDemonstração%3C/text%3E%3Ctext x='50%25' y='75%25' text-anchor='middle' fill='%2300a86b' font-size='11'%3ER$ " +
        totalAmount.toFixed(2) + "%3C/text%3E%3C/svg%3E";
    return { qrCodeBase64: demoQrBase64, qrCodeString: demoPixString, paymentId: demoId, isDemo: true };
}

/** Exibe o QR Code PIX */
async function displayPixQrCode(debt, totalAmount, plate) {
    const qrcodeArea = document.getElementById('qrcodeArea');
    const pixCodeElement = document.getElementById('pixCode');

    qrcodeArea.innerHTML = `<div class="loading-spinner"></div><span>Gerando PIX...</span>`;
    pixCodeElement.innerHTML = 'Gerando código PIX...';

    try {
        const pixData = generateDemoPix(debt, totalAmount);
        if (pixData.qrCodeBase64) {
            qrcodeArea.innerHTML =
                `<img src="${pixData.qrCodeBase64}" alt="QR Code PIX" style="width: 180px; height: 180px; border-radius: 12px;">`;
        }
        pixCodeElement.innerHTML = pixData.qrCodeString;
        if (pixData.isDemo) {
            showAlert(document.getElementById('dashboardAlert'), '🔷 Modo demonstração', 'info');
        }
    } catch (error) {
        qrcodeArea.innerHTML =
            `<div style="text-align: center; color: #dc2626;"><div style="font-size: 32px;">⚠️</div><span>Erro ao gerar PIX</span></div>`;
        pixCodeElement.innerHTML = 'Erro ao gerar código PIX. Tente novamente.';
    }
}

/** Abre o modal PIX com os dados do débito */
function openPixModal(debt, plate) {
    document.getElementById('modalDebtDesc').textContent = debt.descricao;
    document.getElementById('modalDebtDueDate').textContent = formatDateToBR(debt.data_pagamento);
    const statusLabel = debt.forma_pagamento === 'Atrasado' ? '⚠️ Atrasado' : '⏳ Pendente';
    document.getElementById('modalDebtStatus').textContent = statusLabel;

    let finalAmount = debt.valor;
    const feeDetailEl = document.getElementById('modalFeeDetail');

    if (debt.forma_pagamento === 'Atrasado') {
        const dueDateBR = formatDateToBR(debt.data_pagamento);
        const feeInfo = getFeeDetail(debt.valor, dueDateBR, debt.forma_pagamento);
        if (feeInfo && feeInfo.fee > 0) {
            finalAmount = feeInfo.total;
            feeDetailEl.style.display = 'block';
            feeDetailEl.innerHTML = `
                <strong>💰 Multa por atraso:</strong><br>
                ${feeInfo.days} dia(s) × R$ ${FEE_PER_DAY.toFixed(2)} = R$ ${feeInfo.fee.toFixed(2)}<br>
                <strong>Total com multa:</strong> R$ ${feeInfo.total.toFixed(2)}
            `;
        } else {
            feeDetailEl.style.display = 'none';
        }
    } else {
        feeDetailEl.style.display = 'none';
    }

    document.getElementById('modalAmount').innerHTML = `R$ ${finalAmount.toFixed(2)}`;
    document.getElementById('pixModal').classList.add('active');
    displayPixQrCode(debt, finalAmount, plate);
}

/** Fecha o modal PIX */
function closePixModal() {
    document.getElementById('pixModal').classList.remove('active');
}

/** Copia o código PIX para a área de transferência */
function copyPixCode() {
    const code = document.getElementById('pixCode').innerText;
    if (code && code !== 'Carregando código PIX...' && code !== 'Erro ao gerar código PIX. Tente novamente.') {
        navigator.clipboard.writeText(code).then(() => {
            showAlert(document.getElementById('dashboardAlert'), '✅ Código PIX copiado!', 'success');
        });
    }
}

// ============================================================
// RENDERIZAÇÃO DAS PÁGINAS
// ============================================================

/** Renderiza o conteúdo da página atual */
function renderPageContent(page) {
    if (!currentVehicle) return;

    switch (page) {
        case 'overview':
            renderOverview();
            break;
        case 'debts':
            renderDebts();
            break;
        case 'maintenance':
            renderMaintenance();
            break;
        case 'history':
            renderHistory();
            break;
        case 'summary':
            renderSummary();
            break;
    }
}

/** Renderiza a página de visão geral */
function renderOverview() {
    const v = currentVehicle;
    let totalDebt = 0,
        overdueCount = 0,
        pendingCount = 0,
        totalPaid = 0;

    const pagamentos = v.pagamentos || [];
    pagamentos.forEach(debt => {
        if (debt.forma_pagamento === 'Pago') {
            totalPaid += debt.valor;
            return;
        }
        
        let current = debt.valor;
        if (debt.forma_pagamento === 'Atrasado') {
            const dueDateBR = formatDateToBR(debt.data_pagamento);
            current = calculateTotalWithFee(debt.valor, dueDateBR, debt.forma_pagamento);
            overdueCount++;
        } else if (debt.forma_pagamento === 'Pendente') {
            pendingCount++;
        }
        totalDebt += current;
    });

    const manutencoes = v.manutencoes || [];
    const maintCount = manutencoes.length;
    const totalMaintCost = manutencoes.reduce((sum, m) => sum + m.total, 0);

    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-item">
            <div class="stat-icon">💰</div>
            <div class="stat-value debt">${formatCurrency(totalDebt)}</div>
            <div class="stat-label">Total em débito</div>
        </div>
        <div class="stat-item">
            <div class="stat-icon">⚠️</div>
            <div class="stat-value debt">${overdueCount}</div>
            <div class="stat-label">Atrasados</div>
        </div>
        <div class="stat-item">
            <div class="stat-icon">⏳</div>
            <div class="stat-value">${pendingCount}</div>
            <div class="stat-label">Pendentes</div>
        </div>
        <div class="stat-item">
            <div class="stat-icon">✅</div>
            <div class="stat-value success">${formatCurrency(totalPaid)}</div>
            <div class="stat-label">Total pago</div>
        </div>
        <div class="stat-item">
            <div class="stat-icon">🔧</div>
            <div class="stat-value">${maintCount}</div>
            <div class="stat-label">Manutenções</div>
        </div>
        <div class="stat-item">
            <div class="stat-icon">🔩</div>
            <div class="stat-value">${formatCurrency(totalMaintCost)}</div>
            <div class="stat-label">Custo total</div>
        </div>
    `;
}

/** Renderiza a página de débitos - COM BOTÃO PIX APENAS ÍCONE */
/** Renderiza a página de débitos - APENAS DÉBITOS COM VENCIMENTO EM ATÉ 3 DIAS */
/** Renderiza a página de débitos - VERSÃO CARDS COM DESCRIÇÃO */
/** Renderiza a página de débitos - VERSÃO CARDS */
function renderDebts() {
    const v = currentVehicle;
    const container = document.getElementById('debtsContainer');

    // Filtra apenas débitos não pagos
    const todosPagamentos = (v.pagamentos || []).filter(p => p.forma_pagamento !== 'Pago');

    if (todosPagamentos.length === 0) {
        container.innerHTML =
            `<div class="empty-state"><span class="emoji">🎉</span>Nenhum débito pendente!<br><span style="font-size:12px;color:#94a3b8;">Seu veículo está em dia.</span></div>`;
        return;
    }

    // Filtro: apenas débitos com vencimento em até 3 dias
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const pagamentos = todosPagamentos.filter(debt => {
        const dueDateBR = formatDateToBR(debt.data_pagamento);
        const dueDate = parseDate(dueDateBR);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate - hoje) / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
    });

    if (pagamentos.length === 0) {
        container.innerHTML =
            `<div class="empty-state"><span class="emoji">✅</span>Nenhum débito com vencimento nos próximos 3 dias!<br><span style="font-size:12px;color:#94a3b8;">Todos os débitos vencem em mais de 3 dias.</span></div>`;
        return;
    }

    // Ordenar por data
    pagamentos.sort((a, b) => {
        const dataA = new Date(a.data_pagamento + 'T00:00:00');
        const dataB = new Date(b.data_pagamento + 'T00:00:00');
        return dataA - dataB;
    });

    let html = `<div class="debts-grid">`;
    
    pagamentos.forEach((debt, index) => {
        let displayAmount = debt.valor;
        let originalDisplay = '';
        let isOverdue = debt.forma_pagamento === 'Atrasado';
        let statusLabel = isOverdue ? 'Atrasado' : 'Pendente';
        let statusClass = isOverdue ? 'overdue' : 'pending';

        if (isOverdue) {
            const dueDateBR = formatDateToBR(debt.data_pagamento);
            const feeInfo = getFeeDetail(debt.valor, dueDateBR, debt.forma_pagamento);
            if (feeInfo && feeInfo.fee > 0) {
                originalDisplay = debt.valor;
                displayAmount = feeInfo.total;
            }
        }

        // Dias de atraso
        let daysOverdue = 0;
        if (isOverdue) {
            const dueDateBR = formatDateToBR(debt.data_pagamento);
            const dueDate = parseDate(dueDateBR);
            dueDate.setHours(0, 0, 0, 0);
            const diffTime = hoje - dueDate;
            daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        }

        const debtId = 1000 + index;

        html += `
            <div class="debt-card">
                <!-- CABEÇALHO: ID + DESCRIÇÃO (NO LUGAR DA PLACA) -->
                <div class="debt-card-header">
                    <span class="debt-id">ID: <strong>${debtId}</strong></span>
                    <span class="debt-description-header">${debt.descricao}</span>
                </div>

                <!-- CORPO: INFORMAÇÕES -->
                <div class="debt-card-body">
                    ${isOverdue ? `
                    <div class="debt-info-item">
                        <span class="label">Dias de atraso</span>
                        <span class="value days-overdue"><strong>${daysOverdue}</strong> dia(s)</span>
                    </div>
                    ` : ''}
                    <div class="debt-info-item">
                        <span class="label">Vencimento</span>
                        <span class="value due-date">${formatDateToBR(debt.data_pagamento)}</span>
                    </div>
                    <div class="debt-info-item">
                        <span class="label">${isOverdue ? 'Valor Original' : 'Valor'}</span>
                        <span class="value ${isOverdue ? 'amount-original' : 'amount-total'}">${isOverdue ? `R$ ${debt.valor.toFixed(2)}` : `<strong>R$ ${displayAmount.toFixed(2)}</strong>`}</span>
                    </div>
                    ${isOverdue ? `
                    <div class="debt-info-item">
                        <span class="label">Valor</span>
                        <span class="value amount-total"><strong>R$ ${displayAmount.toFixed(2)}</strong></span>
                    </div>
                    ` : ''}
                </div>

                <!-- RODAPÉ: STATUS + BOTÃO PIX -->
                <div class="debt-card-footer">
                    <span class="debt-status-badge ${statusClass}">${statusLabel}</span>
                    <button class="debt-pay-btn" onclick='openPixModal(${JSON.stringify(debt)}, "${currentPlate}")'>
                        <img src="https://img.icons8.com/?size=100&id=Dk4sj0EM4b20&format=png&color=000000" class="pix-icon-small" alt="PIX">
                        Pagar via Pix
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/** Renderiza a página de manutenções */
function renderMaintenance() {
    const v = currentVehicle;
    const container = document.getElementById('maintenanceContainer');
    const manutencoes = v.manutencoes || [];

    if (manutencoes.length === 0) {
        container.innerHTML =
            `<div class="empty-state"><span class="emoji">🔧</span>Nenhuma manutenção registrada<br><span style="font-size:12px;color:#94a3b8;">As manutenções aparecerão aqui.</span></div>`;
        return;
    }

    let html = `
        <table class="maintenance-table">
            <thead>
                <tr>
                    <th class="col-date">📅 Data</th>
                    <th class="col-desc">Serviço</th>
                    <th class="col-parts">Peças trocadas</th>
                    <th class="col-labor">Mão de obra</th>
                    <th class="col-total">Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    manutencoes.forEach(m => {
        html += `
            <tr>
                <td class="col-date"><strong>${formatDateToBR(m.data_manutencao)}</strong></td>
                <td class="col-desc">${m.descricao}</td>
                <td class="col-parts">${m.pecas || '-'}</td>
                <td class="col-labor">${formatCurrency(m.mao_obra)}</td>
                <td class="col-total"><strong>${formatCurrency(m.total)}</strong></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}
// ============================================================
// FILTROS DE MANUTENÇÕES
// ============================================================

let maintenanceFilters = {
    year: 'todos',
    month: 'todos',
    day: 'todos'
};

/** Renderiza a página de manutenções com filtros */
function renderMaintenance() {
    const v = currentVehicle;
    const container = document.getElementById('maintenanceContainer');
    const manutencoes = v.manutencoes || [];

    // Extrai anos, meses e dias únicos para os filtros
    const years = [...new Set(manutencoes.map(m => m.data_manutencao ? m.data_manutencao.split('-')[0] : null))].filter(Boolean).sort();
    const months = [...new Set(manutencoes.map(m => m.data_manutencao ? m.data_manutencao.split('-')[1] : null))].filter(Boolean).sort();
    const days = [...new Set(manutencoes.map(m => m.data_manutencao ? m.data_manutencao.split('-')[2] : null))].filter(Boolean).sort();

    // Aplica os filtros
    let filtered = manutencoes.filter(m => {
        if (!m.data_manutencao) return false;
        const [year, month, day] = m.data_manutencao.split('-');
        
        if (maintenanceFilters.year !== 'todos' && year !== maintenanceFilters.year) return false;
        if (maintenanceFilters.month !== 'todos' && month !== maintenanceFilters.month) return false;
        if (maintenanceFilters.day !== 'todos' && day !== maintenanceFilters.day) return false;
        return true;
    });

    // Calcula o total gasto com os filtros aplicados
    const totalFiltered = filtered.reduce((sum, m) => sum + m.total, 0);

    if (manutencoes.length === 0) {
        container.innerHTML = `
            <div class="empty-state"><span class="emoji">🔧</span>Nenhuma manutenção registrada<br><span style="font-size:12px;color:#94a3b8;">As manutenções aparecerão aqui.</span></div>
        `;
        return;
    }

    // Monta o HTML com filtros e tabela
    let html = `
        <!-- Filtros -->
        <div class="filters-container">
            <div class="filter-group">
                <label>📅 Ano</label>
                <select id="filterYear" onchange="applyMaintenanceFilters()">
                    <option value="todos">Todos</option>
                    ${years.map(y => `<option value="${y}" ${maintenanceFilters.year === y ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>📆 Mês</label>
                <select id="filterMonth" onchange="applyMaintenanceFilters()">
                    <option value="todos">Todos</option>
                    ${months.map(m => `<option value="${m}" ${maintenanceFilters.month === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>📅 Dia</label>
                <select id="filterDay" onchange="applyMaintenanceFilters()">
                    <option value="todos">Todos</option>
                    ${days.map(d => `<option value="${d}" ${maintenanceFilters.day === d ? 'selected' : ''}>${d}</option>`).join('')}
                </select>
            </div>
            <button class="filter-clear-btn" onclick="clearMaintenanceFilters()">✕ Limpar filtros</button>
        </div>

        <!-- Total filtrado -->
        <div class="filter-total">
            <span>💰 Total com filtros: </span>
            <strong>${formatCurrency(totalFiltered)}</strong>
            <span style="font-size:12px;color:#5a6a85;margin-left:8px;">(${filtered.length} manutenção(ões))</span>
        </div>
    `;

    if (filtered.length === 0) {
        html += `
            <div class="empty-state" style="margin-top:16px;">
                <span class="emoji">🔍</span>
                Nenhuma manutenção encontrada com os filtros selecionados
                <br><span style="font-size:12px;color:#94a3b8;">Tente ajustar os filtros.</span>
            </div>
        `;
        container.innerHTML = html;
        return;
    }

    html += `
        <table class="maintenance-table">
            <thead>
                <tr>
                    <th class="col-date">📅 Data</th>
                    <th class="col-desc">Serviço</th>
                    <th class="col-parts">Peças trocadas</th>
                    <th class="col-labor">Mão de obra</th>
                    <th class="col-total">Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Ordena por data (mais recente primeiro)
    filtered.sort((a, b) => {
        if (a.data_manutencao > b.data_manutencao) return -1;
        if (a.data_manutencao < b.data_manutencao) return 1;
        return 0;
    });

    filtered.forEach(m => {
        html += `
            <tr>
                <td class="col-date"><strong>${formatDateToBR(m.data_manutencao)}</strong></td>
                <td class="col-desc">${m.descricao}</td>
                <td class="col-parts">${m.pecas || '-'}</td>
                <td class="col-labor">${formatCurrency(m.mao_obra)}</td>
                <td class="col-total"><strong>${formatCurrency(m.total)}</strong></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/** Aplica os filtros selecionados */
function applyMaintenanceFilters() {
    const year = document.getElementById('filterYear')?.value || 'todos';
    const month = document.getElementById('filterMonth')?.value || 'todos';
    const day = document.getElementById('filterDay')?.value || 'todos';
    
    maintenanceFilters = { year, month, day };
    renderMaintenance();
}

/** Limpa todos os filtros */
function clearMaintenanceFilters() {
    maintenanceFilters = { year: 'todos', month: 'todos', day: 'todos' };
    renderMaintenance();
}
/** Renderiza a página de histórico (apenas pagamentos pagos) */
// ============================================================
// FILTROS DE HISTÓRICO
// ============================================================

let historyFilters = {
    year: 'todos',
    month: 'todos',
    day: 'todos'
};

/** Renderiza a página de histórico com filtros */
function renderHistory() {
    const v = currentVehicle;
    const container = document.getElementById('historyContainer');

    const historico = (v.pagamentos || []).filter(p => p.forma_pagamento === 'Pago');

    // Extrai anos, meses e dias únicos para os filtros
    const years = [...new Set(historico.map(h => h.data_pagamento ? h.data_pagamento.split('-')[0] : null))].filter(Boolean).sort();
    const months = [...new Set(historico.map(h => h.data_pagamento ? h.data_pagamento.split('-')[1] : null))].filter(Boolean).sort();
    const days = [...new Set(historico.map(h => h.data_pagamento ? h.data_pagamento.split('-')[2] : null))].filter(Boolean).sort();

    // Aplica os filtros
    let filtered = historico.filter(h => {
        if (!h.data_pagamento) return false;
        const [year, month, day] = h.data_pagamento.split('-');
        
        if (historyFilters.year !== 'todos' && year !== historyFilters.year) return false;
        if (historyFilters.month !== 'todos' && month !== historyFilters.month) return false;
        if (historyFilters.day !== 'todos' && day !== historyFilters.day) return false;
        return true;
    });

    // Calcula o total gasto com os filtros aplicados
    const totalFiltered = filtered.reduce((sum, h) => sum + h.valor, 0);

    if (historico.length === 0) {
        container.innerHTML = `
            <div class="empty-state"><span class="emoji">📭</span>Nenhum histórico de pagamento<br><span style="font-size:12px;color:#94a3b8;">Os pagamentos aparecerão aqui.</span></div>
        `;
        return;
    }

    // Monta o HTML com filtros e tabela
    let html = `
        <!-- Filtros -->
        <div class="filters-container">
            <div class="filter-group">
                <label>📅 Ano</label>
                <select id="historyFilterYear" onchange="applyHistoryFilters()">
                    <option value="todos">Todos</option>
                    ${years.map(y => `<option value="${y}" ${historyFilters.year === y ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>📆 Mês</label>
                <select id="historyFilterMonth" onchange="applyHistoryFilters()">
                    <option value="todos">Todos</option>
                    ${months.map(m => `<option value="${m}" ${historyFilters.month === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>📅 Dia</label>
                <select id="historyFilterDay" onchange="applyHistoryFilters()">
                    <option value="todos">Todos</option>
                    ${days.map(d => `<option value="${d}" ${historyFilters.day === d ? 'selected' : ''}>${d}</option>`).join('')}
                </select>
            </div>
            <button class="filter-clear-btn" onclick="clearHistoryFilters()">✕ Limpar filtros</button>
        </div>

        <!-- Total filtrado -->
        <div class="filter-total">
            <span>💰 Total com filtros: </span>
            <strong>${formatCurrency(totalFiltered)}</strong>
            <span style="font-size:12px;color:#5a6a85;margin-left:8px;">(${filtered.length} pagamento(s))</span>
        </div>
    `;

    if (filtered.length === 0) {
        html += `
            <div class="empty-state" style="margin-top:16px;">
                <span class="emoji">🔍</span>
                Nenhum pagamento encontrado com os filtros selecionados
                <br><span style="font-size:12px;color:#94a3b8;">Tente ajustar os filtros.</span>
            </div>
        `;
        container.innerHTML = html;
        return;
    }

    html += `
        <table class="history-table">
            <thead>
                <tr>
                    <th class="col-date">📅 Data</th>
                    <th class="col-desc">Descrição</th>
                    <th class="col-amount">Valor</th>
                    <th class="col-ref">Forma</th>
                    <th class="col-status">Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Ordena por data (mais recente primeiro)
    filtered.sort((a, b) => {
        if (a.data_pagamento > b.data_pagamento) return -1;
        if (a.data_pagamento < b.data_pagamento) return 1;
        return 0;
    });

    filtered.forEach(h => {
        html += `
            <tr>
                <td class="col-date">${formatDateToBR(h.data_pagamento)}</td>
                <td class="col-desc">${h.descricao}</td>
                <td class="col-amount"><strong>${formatCurrency(h.valor)}</strong></td>
                <td class="col-ref">${h.forma_pagamento || '-'}</td>
                <td class="col-status"><span class="badge badge-paid">✅ Pago</span></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/** Aplica os filtros selecionados no histórico */
function applyHistoryFilters() {
    const year = document.getElementById('historyFilterYear')?.value || 'todos';
    const month = document.getElementById('historyFilterMonth')?.value || 'todos';
    const day = document.getElementById('historyFilterDay')?.value || 'todos';
    
    historyFilters = { year, month, day };
    renderHistory();
}

/** Limpa todos os filtros do histórico */
function clearHistoryFilters() {
    historyFilters = { year: 'todos', month: 'todos', day: 'todos' };
    renderHistory();
}

/** Renderiza a página de resumo */
function renderSummary() {
    const v = currentVehicle;
    const container = document.getElementById('summaryContainer');

    let totalDebt = 0,
        overdueCount = 0,
        pendingCount = 0,
        totalPaid = 0,
        totalOverdueAmount = 0,
        totalPendingAmount = 0;

    const pagamentos = v.pagamentos || [];
    pagamentos.forEach(debt => {
        if (debt.forma_pagamento === 'Pago') {
            totalPaid += debt.valor;
            return;
        }
        
        let current = debt.valor;
        if (debt.forma_pagamento === 'Atrasado') {
            const dueDateBR = formatDateToBR(debt.data_pagamento);
            current = calculateTotalWithFee(debt.valor, dueDateBR, debt.forma_pagamento);
            totalOverdueAmount += current;
            overdueCount++;
        } else if (debt.forma_pagamento === 'Pendente') {
            totalPendingAmount += current;
            pendingCount++;
        }
        totalDebt += current;
    });

    const manutencoes = v.manutencoes || [];
    const totalMaint = manutencoes.reduce((sum, m) => sum + m.total, 0);
    const maintCount = manutencoes.length;

    const hasOverdue = overdueCount > 0;
    const hasPending = pendingCount > 0;
    const isAllPaid = pagamentos.filter(p => p.forma_pagamento !== 'Pago').length === 0;

    let statusMessage = '',
        statusColor = '';
    if (isAllPaid) {
        statusMessage = '✅ Tudo em dia!';
        statusColor = '#059669';
    } else if (hasOverdue) {
        statusMessage = '⚠️ Atenção! Há débitos atrasados.';
        statusColor = '#dc2626';
    } else if (hasPending) {
        statusMessage = '⏳ Há débitos pendentes. Fique atento aos vencimentos.';
        statusColor = '#d97706';
    }

    const vehicleName = `${v.marca} ${v.modelo} ${v.ano}`;

    container.innerHTML = `
        <div style="background: ${statusColor}10; border: 1px solid ${statusColor}30; border-radius: 20px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: ${statusColor};">${statusMessage}</div>
            <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Situação atual do veículo ${vehicleName}</div>
        </div>

        <div class="stats-summary-grid">
            <div class="stats-summary-card">
                <div class="number debt">${formatCurrency(totalDebt)}</div>
                <div class="label">💰 Total em débito</div>
            </div>
            <div class="stats-summary-card">
                <div class="number success">${formatCurrency(totalPaid)}</div>
                <div class="label">✅ Total já pago</div>
            </div>
            <div class="stats-summary-card">
                <div class="number">${pagamentos.filter(p => p.forma_pagamento !== 'Pago').length}</div>
                <div class="label">📋 Débitos totais</div>
            </div>
            <div class="stats-summary-card">
                <div class="number">${pagamentos.filter(p => p.forma_pagamento === 'Pago').length}</div>
                <div class="label">📜 Pagamentos realizados</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="background: #fef3c7; padding: 16px; border-radius: 16px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #d97706;">${pendingCount}</div>
                <div style="font-size: 12px; color: #92400e;">⏳ Pendentes</div>
            </div>
            <div style="background: #fee2e2; padding: 16px; border-radius: 16px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #dc2626;">${overdueCount}</div>
                <div style="font-size: 12px; color: #991b1b;">⚠️ Atrasados</div>
            </div>
            <div style="background: #e0e7ff; padding: 16px; border-radius: 16px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #4f46e5;">${maintCount}</div>
                <div style="font-size: 12px; color: #3730a3;">🔧 Manutenções</div>
            </div>
        </div>

        ${hasOverdue ? `
        <div style="margin-top: 8px; background: #fee2e2; padding: 16px; border-radius: 16px; border-left: 4px solid #dc2626;">
            <div style="font-size: 13px; font-weight: 600; color: #dc2626;">🔴 Débitos em atraso:</div>
            <div style="font-size: 13px; color: #991b1b; margin-top: 4px;">${formatCurrency(totalOverdueAmount)} em débitos atrasados</div>
            <div style="font-size: 11px; color: #991b1b; margin-top: 2px;">Multa de R$ ${FEE_PER_DAY.toFixed(2)} por dia de atraso (máx. ${MAX_FEE_DAYS} dias)</div>
        </div>
        ` : ''}

        ${maintCount > 0 ? `
        <div style="margin-top: 16px; background: #e0e7ff30; padding: 16px; border-radius: 16px; border-left: 4px solid #4f46e5;">
            <div style="font-size: 13px; font-weight: 600; color: #4f46e5;">🔧 Resumo de manutenções:</div>
            <div style="font-size: 13px; color: #3730a3; margin-top: 4px;">${maintCount} manutenção(ões) realizadas</div>
            <div style="font-size: 13px; color: #3730a3;">Total gasto: <strong>${formatCurrency(totalMaint)}</strong></div>
        </div>
        ` : ''}

        <div style="margin-top: 16px; background: #f1f5f9; padding: 16px; border-radius: 16px; text-align: center; font-size: 12px; color: #64748b;">
            🚗 <strong>${vehicleName}</strong> • Placa <strong>${currentPlate}</strong>
        </div>
    `;
}

// ============================================================
// UI
// ============================================================

/** Exibe um alerta no elemento especificado */
function showAlert(element, message, type = 'error') {
    element.className = `alert alert-${type}`;
    element.innerHTML = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

/** Preenche o campo de placa com um exemplo */
function setExamplePlate(plate) {
    document.getElementById('plateInput').value = plate;
    document.getElementById('loginAlert').style.display = 'none';
}

/** Atualiza o dashboard com os dados do veículo */
function updateDashboard(vehicle, plate) {
    currentVehicle = vehicle;
    currentPlate = plate;

    const vehicleName = `${vehicle.marca} ${vehicle.modelo} ${vehicle.ano}`;
    document.getElementById('plateDisplay').innerHTML = plate;
    document.getElementById('vehicleModel').innerHTML = vehicleName;

    updateSidebarVehicle(vehicle, plate);
    renderPageContent(currentPage);
}

// ============================================================
// LOGIN / LOGOUT
// ============================================================

/** Função chamada ao clicar em "Consultar" */
function handleLogin() {
    let plate = document.getElementById('plateInput').value.trim();
    const alertDiv = document.getElementById('loginAlert');
    alertDiv.style.display = 'none';

    if (!plate) {
        showAlert(alertDiv, 'Informe a placa do veículo', 'error');
        return;
    }
    if (!isValidPlate(plate)) {
        showAlert(alertDiv, 'Formato inválido! Ex: ABC1234', 'error');
        return;
    }

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ Consultando...';

    const placaNormalizada = normalizePlate(plate);
    
    fetch('/api/consulta/' + encodeURIComponent(placaNormalizada))
        .then(r => r.json())
        .then(data => {
            btn.disabled = false;
            btn.innerHTML = '<span>🔍</span> Consultar débitos';

            if (data.error) {
                showAlert(alertDiv, data.error, 'error');
                return;
            }

            // Transição suave para o dashboard
            document.getElementById('loginScreen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('loginScreen').style.opacity = '1';
                document.getElementById('dashboard').classList.add('active');

                // Define a página inicial como DÉBITOS
                currentPage = 'debts';
                document.querySelectorAll('.sidebar-nav-item[data-page]').forEach(item => {
                    item.classList.toggle('active', item.dataset.page === 'debts');
                });
                document.querySelectorAll('.page').forEach(p => {
                    p.classList.toggle('active', p.id === 'page-debts');
                });

                // Estrutura os dados para o formato esperado
                const vehicleData = {
                    ...data.veiculo,
                    pagamentos: data.pagamentos || [],
                    manutencoes: data.manutencoes || []
                };

                updateDashboard(vehicleData, placaNormalizada);
            }, 200);
        })
        .catch(err => {
            btn.disabled = false;
            btn.innerHTML = '<span>🔍</span> Consultar débitos';
            showAlert(alertDiv, 'Erro ao consultar. Tente novamente.', 'error');
            console.error(err);
        });

    document.getElementById('plateInput').value = '';
}

/** Função chamada ao clicar em "Nova consulta" */
function handleLogout() {
    closeSidebar();
    document.getElementById('dashboard').classList.remove('active');
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('plateInput').focus();

    currentVehicle = null;
    currentPlate = '';
    updateSidebarVehicle(null, '');

    // Limpa os containers
    document.getElementById('statsGrid').innerHTML = '';
    document.getElementById('debtsContainer').innerHTML = '';
    document.getElementById('maintenanceContainer').innerHTML = '';
    document.getElementById('historyContainer').innerHTML = '';
    document.getElementById('summaryContainer').innerHTML = '';
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Enter no campo de placa
document.getElementById('plateInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') handleLogin();
});

// Tecla ESC fecha sidebar e modal
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeSidebar();
        const modal = document.getElementById('pixModal');
        if (modal.classList.contains('active')) closePixModal();
    }
});

// Clique fora do modal fecha
document.getElementById('pixModal').addEventListener('click', function(e) {
    if (e.target === this) closePixModal();
});

// Ao carregar a página, foca no campo de placa
window.addEventListener('load', () => {
    document.getElementById('plateInput').focus();
    updateSidebarVehicle(null, '');
});

// ============================================================
// EVENTO PARA CLICAR NO VEÍCULO - ABRE DÉBITOS
// ============================================================

// Aguarda o DOM carregar para adicionar o evento
document.addEventListener('DOMContentLoaded', function() {
    // Adiciona evento de clique no nome do veículo (cabeçalho)
    const vehicleModelElement = document.getElementById('vehicleModel');
    if (vehicleModelElement) {
        vehicleModelElement.style.cursor = 'pointer';
        vehicleModelElement.addEventListener('click', function() {
            navigateTo('debts');
        });
    }

    // Adiciona evento de clique no veículo da sidebar
    const sidebarVehicle = document.getElementById('sidebarVehicle');
    if (sidebarVehicle) {
        sidebarVehicle.style.cursor = 'pointer';
        sidebarVehicle.addEventListener('click', function() {
            closeSidebar();
            navigateTo('debts');
        });
    }
});

// ============================================================
// CONTRATO - NOVA FUNÇÃO
// ============================================================

/** Renderiza a página de contrato */
function renderContract() {
    const container = document.getElementById('contractContainer');
    
    if (!currentVehicle) {
        container.innerHTML = `<div class="empty-state"><span class="emoji">📄</span>Nenhum veículo selecionado</div>`;
        return;
    }

    const vehicle = currentVehicle;
    const plate = currentPlate;
    const vehicleName = `${vehicle.marca} ${vehicle.modelo} ${vehicle.ano}`;

    // Dados do locatário (exemplo)
    const locatario = {
        nome: 'João da Silva',
        cpf: '000.000.000-00',
        telefone: '(92) 99999-9999',
        endereco: 'Rua Exemplo, 123'
    };

    // Dados da locação
    const hoje = new Date();
    const dataInicial = hoje.toISOString().split('T')[0];
    const dataFinal = new Date(hoje);
    dataFinal.setDate(dataFinal.getDate() + 7);
    const dataFinalStr = dataFinal.toISOString().split('T')[0];

    // Calcular valor semanal (baseado nos débitos)
    let valorSemanal = 200;
    let caução = 500;

    // Se houver débitos, ajustar valores
    const pagamentos = vehicle.pagamentos || [];
    const debitosPendentes = pagamentos.filter(p => p.forma_pagamento !== 'Pago');
    if (debitosPendentes.length > 0) {
        const totalDebito = debitosPendentes.reduce((sum, p) => sum + p.valor, 0);
        valorSemanal = Math.max(150, 200 + Math.floor(totalDebito / 10));
        caução = Math.max(300, 500 + Math.floor(totalDebito / 5));
    }

    container.innerHTML = `
        <div class="contract-container">
            <!-- Status do Contrato -->
            <div class="contract-status">
                <span class="status-badge active">✅ Contrato Ativo</span>
                <span class="status-badge info">📅 Vigência: ${formatDateToBR(dataInicial)} - ${formatDateToBR(dataFinalStr)}</span>
            </div>

            <!-- Dados do Locatário -->
            <div class="contract-card">
                <h3>👤 Dados do Locatário</h3>
                <div class="contract-grid">
                    <div class="contract-field">
                        <label>Nome</label>
                        <input type="text" id="locatarioNome" value="${locatario.nome}">
                    </div>
                    <div class="contract-field">
                        <label>CPF</label>
                        <input type="text" id="locatarioCpf" value="${locatario.cpf}">
                    </div>
                    <div class="contract-field">
                        <label>Telefone</label>
                        <input type="text" id="locatarioTelefone" value="${locatario.telefone}">
                    </div>
                    <div class="contract-field">
                        <label>Endereço</label>
                        <input type="text" id="locatarioEndereco" value="${locatario.endereco}">
                    </div>
                </div>
            </div>

            <!-- Dados do Veículo -->
            <div class="contract-card">
                <h3>🚗 Veículo</h3>
                <div class="contract-grid">
                    <div class="contract-field">
                        <label>Marca</label>
                        <input type="text" value="${vehicle.marca}" readonly>
                    </div>
                    <div class="contract-field">
                        <label>Modelo</label>
                        <input type="text" value="${vehicle.modelo}" readonly>
                    </div>
                    <div class="contract-field">
                        <label>Ano</label>
                        <input type="text" value="${vehicle.ano}" readonly>
                    </div>
                    <div class="contract-field">
                        <label>Placa</label>
                        <input type="text" value="${plate}" readonly style="font-family: monospace; letter-spacing: 2px; color: #38bdf8;">
                    </div>
                </div>
            </div>

            <!-- Dados da Locação -->
            <div class="contract-card">
                <h3>💰 Dados da Locação</h3>
                <div class="contract-grid">
                    <div class="contract-field">
                        <label>Valor Semanal</label>
                        <input type="text" id="valorSemanal" value="R$ ${valorSemanal.toFixed(2).replace('.', ',')}">
                    </div>
                    <div class="contract-field">
                        <label>Caução</label>
                        <input type="text" id="valorCaucao" value="R$ ${caução.toFixed(2).replace('.', ',')}">
                    </div>
                    <div class="contract-field">
                        <label>Data Inicial</label>
                        <input type="date" id="dataInicial" value="${dataInicial}">
                    </div>
                    <div class="contract-field">
                        <label>Data Final</label>
                        <input type="date" id="dataFinal" value="${dataFinalStr}">
                    </div>
                </div>
                <br>
                <label style="display: block; font-size: 13px; margin-bottom: 6px; color: #94a3b8;">Observações</label>
                <textarea id="observacoes" style="width:100%; padding:12px; border:none; border-radius:12px; background:#334155; color:#FFF; font-size:15px; height:100px; resize:vertical;">Veículo em bom estado, sem avarias aparentes.</textarea>
            </div>

            <!-- PDF -->
            <div class="contract-card">
                <h3>📄 Contrato em PDF</h3>
                <div class="contract-pdf">
                    <div class="pdf-preview">
                        <div class="pdf-placeholder">
                            <span style="font-size: 48px;">📄</span>
                            <span style="color: #94a3b8; font-size: 14px;">Contrato de Locação - ${vehicleName}</span>
                            <span style="color: #64748b; font-size: 12px;">Clique em "Gerar PDF" para criar o documento</span>
                        </div>
                    </div>
                </div>
                <div class="contract-buttons">
                    <button class="contract-btn primary" onclick="generateContractPDF()">
                        📄 Gerar PDF
                    </button>
                    <button class="contract-btn success" onclick="saveContract()">
                        💾 Salvar Alterações
                    </button>
                    <button class="contract-btn info" onclick="previewContract()">
                        👁 Visualizar
                    </button>
                </div>
            </div>

            <!-- Resumo dos Débitos -->
            ${debitosPendentes.length > 0 ? `
            <div class="contract-card" style="border-color: #dc2626;">
                <h3 style="color: #dc2626;">⚠️ Débitos Pendentes</h3>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${debitosPendentes.map(d => `
                        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #0f172a; border-radius: 8px;">
                            <span style="color: #94a3b8;">${d.descricao}</span>
                            <span style="color: #dc2626; font-weight: bold;">R$ ${d.valor.toFixed(2)}</span>
                        </div>
                    `).join('')}
                    <div style="text-align: right; padding-top: 8px; border-top: 1px solid #334155;">
                        <span style="color: #94a3b8;">Total em débito: </span>
                        <span style="color: #dc2626; font-weight: bold;">R$ ${debitosPendentes.reduce((sum, d) => sum + d.valor, 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

/** Gera PDF do contrato (simulação) */
function generateContractPDF() {
    const nome = document.getElementById('locatarioNome')?.value || 'João da Silva';
    const cpf = document.getElementById('locatarioCpf')?.value || '000.000.000-00';
    const telefone = document.getElementById('locatarioTelefone')?.value || '(92) 99999-9999';
    const endereco = document.getElementById('locatarioEndereco')?.value || 'Rua Exemplo, 123';
    const valorSemanal = document.getElementById('valorSemanal')?.value || 'R$ 200,00';
    const valorCaucao = document.getElementById('valorCaucao')?.value || 'R$ 500,00';
    const dataInicial = document.getElementById('dataInicial')?.value || '2026-01-01';
    const dataFinal = document.getElementById('dataFinal')?.value || '2026-01-08';
    const observacoes = document.getElementById('observacoes')?.value || '';

    const vehicle = currentVehicle;
    const plate = currentPlate;
    const vehicleName = vehicle ? `${vehicle.marca} ${vehicle.modelo} ${vehicle.ano}` : 'Veículo';

    // Simula geração de PDF
    showAlert(document.getElementById('dashboardAlert'), 
        `📄 <strong>PDF Gerado!</strong><br>Contrato de Locação<br>Veículo: ${vehicleName}<br>Placa: ${plate}<br>Locatário: ${nome}<br>Valor: ${valorSemanal}/semana`,
        'success'
    );

    // Atualiza o preview
    const preview = document.querySelector('.pdf-placeholder');
    if (preview) {
        preview.innerHTML = `
            <span style="font-size: 48px;">✅</span>
            <span style="color: #22c55e; font-size: 14px; font-weight: bold;">PDF Gerado com Sucesso!</span>
            <span style="color: #94a3b8; font-size: 12px;">Contrato de ${vehicleName} - ${plate}</span>
            <span style="color: #64748b; font-size: 11px;">Clique em "Visualizar" para abrir o PDF</span>
        `;
    }
}

/** Salva as alterações do contrato */
function saveContract() {
    const nome = document.getElementById('locatarioNome')?.value || '';
    const cpf = document.getElementById('locatarioCpf')?.value || '';
    const telefone = document.getElementById('locatarioTelefone')?.value || '';
    const endereco = document.getElementById('locatarioEndereco')?.value || '';
    const valorSemanal = document.getElementById('valorSemanal')?.value || '';
    const valorCaucao = document.getElementById('valorCaucao')?.value || '';
    const dataInicial = document.getElementById('dataInicial')?.value || '';
    const dataFinal = document.getElementById('dataFinal')?.value || '';
    const observacoes = document.getElementById('observacoes')?.value || '';

    showAlert(document.getElementById('dashboardAlert'), 
        `💾 <strong>Dados salvos!</strong><br>Locatário: ${nome}<br>Valor: ${valorSemanal}/semana`,
        'success'
    );
}

/** Visualiza o contrato */
function previewContract() {
    showAlert(document.getElementById('dashboardAlert'), 
        `👁 <strong>Visualizando Contrato</strong><br>O contrato será aberto em uma nova janela.`,
        'info'
    );
    
    // Simula abertura em nova janela
    setTimeout(() => {
        window.open('#', '_blank');
    }, 500);
}

// Adicionar no switch de renderPageContent
const originalRenderPageContent = renderPageContent;
renderPageContent = function(page) {
    if (page === 'contract') {
        renderContract();
        return;
    }
    originalRenderPageContent(page);
};