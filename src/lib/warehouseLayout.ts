export type PositionType = "doca" | "posicao";

export interface DockLevel {
    level: number;
    status: "vazio" | "ocupado" | "bloqueado";
    product?: string;
    product_code?: string;
    qty?: number;
}

export interface DockDefinition {
    code: string;
    type: PositionType;
    label: string;
    shortLabel?: string;
    galpao: number;
    rua?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    defaultCapacity: number;
    levels: DockLevel[];
}

export interface WarehouseRoom {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
    fill?: string;
    stroke?: string;
    vertical?: boolean;
    isStreet?: boolean;
}

/* ============================================================
 * HELPER DE NÍVEIS
 * ============================================================ */

function default1Level(): DockLevel[] {
    return [{ level: 1, status: "vazio" }];
}

function default4Levels(): DockLevel[] {
    return [
        { level: 4, status: "vazio" },
        { level: 3, status: "vazio" },
        { level: 2, status: "vazio" },
        { level: 1, status: "vazio" },
    ];
}

/* ============================================================
 * CONFIGURAÇÕES GLOBAIS DE GRADE
 *
 * Estas constantes (COL_W, COL_H, GAP...) são a "unidade" de
 * tamanho das posições/docas comuns. O Galpão 2 reaproveita
 * exatamente as mesmas constantes do Galpão 1 para que toda
 * posição do tipo "posicao" tenha o mesmo tamanho visual nos
 * dois galpões, como pedido.
 * ============================================================ */

const GAP = 5;
const COL_W = 44;
const COL_H = 38;
const BAND_H = 90;
const BAND_H_SM = 30;
const BLOCK_GAP = 12;
const MARGIN_X = 30;

const LEFT_COLS = 7;
const LEFT_WIDTH = LEFT_COLS * (COL_W + GAP) - GAP;
const CORRIDOR_W = 50;
const SIDE_W = LEFT_WIDTH;
const TOTAL_W = LEFT_WIDTH + CORRIDOR_W + SIDE_W + GAP * 2;

interface BuiltBlock {
    defs: DockDefinition[];
    rooms: WarehouseRoom[];
    width: number;
    height: number;
}

/* ============================================================
 * HELPER: reescala um bloco inteiro (posições + salas) para que
 * sua largura/altura final batam exatamente com um alvo (usado
 * para forçar o Galpão 2 a ficar do mesmo tamanho do Galpão 1).
 * O bloco é escalado em torno do seu próprio canto superior
 * esquerdo (originX, originY) — normalmente o offsetX/offsetY
 * usado para construí-lo — então sua posição na tela não muda,
 * só o tamanho interno.
 * ============================================================ */

function scaleBuiltBlock(
    block: BuiltBlock,
    originX: number,
    originY: number,
    targetWidth: number,
    targetHeight: number
): BuiltBlock {
    if (block.width <= 0 || block.height <= 0) return block;

    const scaleX = targetWidth / block.width;
    const scaleY = targetHeight / block.height;

    const transform = (item: { x: number; y: number; width: number; height: number }) => {
        item.x = originX + (item.x - originX) * scaleX;
        item.y = originY + (item.y - originY) * scaleY;
        item.width = item.width * scaleX;
        item.height = item.height * scaleY;
    };

    block.defs.forEach(transform);
    block.rooms.forEach(transform);

    return { ...block, width: targetWidth, height: targetHeight };
}

/* ============================================================
 * FÁBRICA DO GALPÃO 1
 *
 * Layout replicado a partir da referência visual do galpão 1:
 * RUA 017 (topo) -> RUA 016 -> RUA 013 -> RUA 12..07 (docas
 * emparelhadas à direita) -> RUA 04/03 (com Estoque de Amostras
 * e RUA 02/06/05 na coluna direita) -> bloco "AQUI SÃO PALLETS"
 * (docas numeradas 01 a 43, em formato de escada) + área "INÍCIO".
 * ============================================================ */

function buildGalpao1Block(
    galpaoNum: number,
    codePrefix: string,
    docaPrefix: string,
    offsetX: number,
    offsetY: number,
    headerLabel: string
): BuiltBlock {
    let seq = 0;
    const defs: DockDefinition[] = [];
    const rooms: WarehouseRoom[] = [];

    const LEFT_X = offsetX + MARGIN_X;
    const CORRIDOR_X = LEFT_X + LEFT_WIDTH + GAP;
    const SIDE_X = CORRIDOR_X + CORRIDOR_W + GAP;

    function cell(rua: string, x: number, y: number, w: number, h: number): DockDefinition {
        seq += 1;
        const code = `${codePrefix}${String(seq).padStart(3, "0")}`;
        return {
            code,
            type: "posicao",
            label: code,
            shortLabel: String(seq),
            galpao: galpaoNum,
            rua,
            x,
            y,
            width: w,
            height: h,
            defaultCapacity: 1,
            levels: default1Level(),
        };
    }

    function docaCell(num: number, x: number, y: number, w: number, h: number): DockDefinition {
        const numStr = String(num).padStart(2, "0");
        const code = `${docaPrefix}-${numStr}`;
        return {
            code,
            type: "doca",
            label: code,
            shortLabel: numStr,
            galpao: galpaoNum,
            rua: "RUA 001",
            x,
            y,
            width: w,
            height: h,
            defaultCapacity: 4,
            levels: default4Levels(),
        };
    }

    function row(rua: string, count: number, x: number, y: number, w = COL_W, h = COL_H): DockDefinition[] {
        return Array.from({ length: count }, (_, i) => cell(rua, x + i * (w + GAP), y, w, h));
    }

    function pairRow(rua: string, x: number, y: number, w = SIDE_W, h = COL_H): DockDefinition[] {
        const half = (w - GAP) / 2;
        return [cell(rua, x, y, half, h), cell(rua, x + half + GAP, y, half, h)];
    }

    function single(rua: string, x: number, y: number, w: number, h: number): DockDefinition {
        return cell(rua, x, y, w, h);
    }

    let cursorY = offsetY + 70;

    /* ---------- TOPO (RUA 017) ---------- */
    {
        const topCellW = (TOTAL_W - 7 * GAP) / 8;
        defs.push(...row("RUA 017", 8, LEFT_X, cursorY, topCellW, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-017`, x: LEFT_X, y: cursorY, width: TOTAL_W, height: BAND_H, label: "RUA 017", isStreet: true });
        cursorY += BAND_H + GAP;
    }

    const corridorTopY = cursorY;

    {
        // Linha curta (6 posições) + doca larga isolada à direita — igual à referência.
        defs.push(...row("RUA 017", 6, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(single("RUA 017", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + BLOCK_GAP;
    }

    /* ---------- RUA 016 (grade de 7 colunas + 2 docas largas à direita) ---------- */
    {
        defs.push(...row("RUA 016", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(single("RUA 016", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + GAP;

        defs.push(...row("RUA 016", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(single("RUA 016", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-016`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H_SM, label: "RUA 016", isStreet: true });
        cursorY += BAND_H_SM + GAP;

        defs.push(...row("RUA 016", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + BLOCK_GAP;
    }

    /* ---------- RUA 013 (grade de 7 colunas + doca larga e docas emparelhadas) ---------- */
    {
        defs.push(...row("RUA 013", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(single("RUA 013", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-013-l`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H, label: "RUA 013", isStreet: true });
        rooms.push({ id: `${codePrefix}-rua-013-r`, x: SIDE_X, y: cursorY, width: SIDE_W, height: BAND_H, label: "RUA 013", isStreet: true });
        cursorY += BAND_H + GAP;

        defs.push(...row("RUA 013", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(...pairRow("RUA 013", SIDE_X, cursorY));
        cursorY += COL_H + GAP;

        defs.push(...row("RUA 013", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(...pairRow("RUA 013", SIDE_X, cursorY));
        cursorY += COL_H + BLOCK_GAP;
    }

    /* ---------- RUAS 12 A 07 (docas emparelhadas à direita) ----------
     * Na referência: RUA 12 e RUA 07 têm 1 linha cada; RUA 11, 10, 09 e
     * 08 têm 2 linhas cada — por isso o array abaixo controla `rows`
     * por rua em vez de repetir sempre 2 linhas.
     */
    {
        const midStreets: { label: string; rows: number }[] = [
            { label: "RUA 12", rows: 1 },
            { label: "RUA 11", rows: 2 },
            { label: "RUA 10", rows: 2 },
            { label: "RUA 09", rows: 2 },
            { label: "RUA 08", rows: 2 },
            { label: "RUA 07", rows: 1 },
        ];

        for (const street of midStreets) {
            for (let r = 0; r < street.rows; r++) {
                defs.push(...row(street.label, 7, LEFT_X, cursorY, COL_W, COL_H));
                defs.push(...pairRow(street.label, SIDE_X, cursorY));
                cursorY += COL_H + GAP;
            }

            const slug = street.label.replace(/\s+/g, "-").toLowerCase();
            rooms.push({ id: `${codePrefix}-${slug}-l`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H_SM, label: street.label, isStreet: true });
            rooms.push({ id: `${codePrefix}-${slug}-r`, x: SIDE_X, y: cursorY, width: SIDE_W, height: BAND_H_SM, label: street.label, isStreet: true });
            cursorY += BAND_H_SM + GAP;
        }
        cursorY += BLOCK_GAP - GAP;
    }

    /* ---------- RUA 04 / RUA 03 + coluna direita (Amostras / RUA 02, 06, 05) ---------- */
    {
        let ry = cursorY;

        defs.push(...row("RUA 04", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-04`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H, label: "RUA 04", isStreet: true });
        cursorY += BAND_H + GAP;

        defs.push(...row("RUA 04", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;
        defs.push(...row("RUA 04", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-03`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H, label: "RUA 03", isStreet: true });
        cursorY += BAND_H + GAP;

        defs.push(...row("RUA 03", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;

        // Coluna direita: Estoque de Amostras no topo, depois docas
        // emparelhadas sob as ruas 02 / 06 / 02 / 05 / 02 (nesta ordem
        // exata, igual à referência).
        const estoqueH = COL_H;
        const amostras = cell("ESTOQUE AMOSTRAS", SIDE_X, ry, SIDE_W, estoqueH);
        amostras.label = "ESTOQUE AMOSTRAS";
        amostras.shortLabel = "AMOSTRAS";
        defs.push(amostras);
        ry += estoqueH + GAP;

        const sideLabels = ["RUA 02", "RUA 06", "RUA 02", "RUA 05"];

        sideLabels.forEach((label, i) => {
            rooms.push({
                id: `${codePrefix}-side-${i}-${label.replace(/\s+/g, "-")}`,
                x: SIDE_X,
                y: ry,
                width: SIDE_W,
                height: BAND_H_SM,
                label,
                isStreet: true,
            });
            ry += BAND_H_SM + GAP;

            defs.push(...pairRow(label, SIDE_X, ry));
            ry += COL_H + GAP;
        });

        rooms.push({ id: `${codePrefix}-side-final-rua-02`, x: SIDE_X, y: ry, width: SIDE_W, height: BAND_H_SM, label: "RUA 02", isStreet: true });
        ry += BAND_H_SM + GAP;

        cursorY = Math.max(cursorY, ry) + BLOCK_GAP;
    }

    const corridorBottomY = cursorY;

    /* ---------- CORREDOR CENTRAL ---------- */
    rooms.push({
        id: `${codePrefix}-corredor-central`,
        x: CORRIDOR_X,
        y: corridorTopY,
        width: CORRIDOR_W,
        height: corridorBottomY - corridorTopY,
        label: "RUA",
        vertical: true,
        isStreet: true,
    });

    /* ---------- BLOCO DE CAIXAS / DOCAS (01 A 43) — "AQUI SÃO PALLETS" ---------- */
    {
        const ITEM_W = (LEFT_WIDTH - 14 * GAP) / 15;
        const ITEM_H = 26;
        const STREET_SIZE = 35;

        const startX = LEFT_X;
        const startY = cursorY + 10;

        rooms.push({
            id: `${codePrefix}-doca-canto-vazio`,
            x: startX,
            y: startY,
            width: ITEM_W,
            height: ITEM_H,
            fill: "#1e293b",
            stroke: "#0f172a",
            label: "",
        });

        for (let num = 30; num <= 43; num++) {
            const i = num - 30;
            const x = startX + ITEM_W + GAP + i * (ITEM_W + GAP);
            defs.push(docaCell(num, x, startY, ITEM_W, ITEM_H));
        }

        for (let num = 29; num >= 21; num--) {
            const i = 29 - num;
            const y = startY + ITEM_H + GAP + i * (ITEM_H + GAP);
            defs.push(docaCell(num, startX, y, ITEM_W, ITEM_H));
        }

        const ruaHW = LEFT_WIDTH - (ITEM_W + GAP);
        rooms.push({
            id: `${codePrefix}-doca-rua-h`,
            x: startX + ITEM_W + GAP,
            y: startY + ITEM_H + GAP,
            width: ruaHW,
            height: STREET_SIZE,
            label: "RUA",
            isStreet: true,
        });

        const ruaVH = 9 * (ITEM_H + GAP) - GAP;
        rooms.push({
            id: `${codePrefix}-doca-rua-v`,
            x: startX + ITEM_W + GAP,
            y: startY + ITEM_H + GAP,
            width: STREET_SIZE,
            height: ruaVH,
            label: "RUA",
            vertical: true,
            isStreet: true,
        });

        const innerStartX = startX + ITEM_W + GAP + STREET_SIZE + GAP;
        const innerStartY = startY + ITEM_H + GAP + STREET_SIZE + GAP;

        const INNER_ITEM_W = (LEFT_WIDTH - (ITEM_W + 2 * GAP + STREET_SIZE) - 13 * GAP) / 14;

        for (let num = 14; num >= 1; num--) {
            const i = 14 - num;
            const x = innerStartX + i * (INNER_ITEM_W + GAP);
            defs.push(docaCell(num, x, innerStartY, INNER_ITEM_W, ITEM_H));
        }

        for (let num = 15; num <= 20; num++) {
            const i = num - 15;
            const y = innerStartY + (i + 1) * (ITEM_H + GAP);
            defs.push(docaCell(num, innerStartX, y, INNER_ITEM_W, ITEM_H));
        }

        const leftBottomY = startY + ITEM_H + GAP + 9 * (ITEM_H + GAP);

        cursorY = leftBottomY + 40;
    }

    const blockWidth = TOTAL_W + MARGIN_X * 2;
    const blockHeight = cursorY - offsetY;

    rooms.unshift({
        id: `${codePrefix}-header`,
        x: offsetX + 10,
        y: offsetY + 10,
        width: blockWidth - 20,
        height: 45,
        fill: "#1e293b",
        label: headerLabel,
    });
    rooms.unshift({
        id: `${codePrefix}-outline`,
        x: offsetX + 10,
        y: offsetY + 10,
        width: blockWidth - 20,
        height: blockHeight,
        fill: "#f8fafc",
        stroke: "#e2e8f0",
    });

    return { defs, rooms, width: blockWidth, height: blockHeight };
}

/* ============================================================
 * FÁBRICA DO GALPÃO MEIO
 *
 * IMPORTANTE: todas as posições deste bloco (a linha "01" do topo
 * e a grade "08" a "14") são pallets/porta-pallet — por isso o
 * `cell()` local já nasce como type: "doca", com 4 níveis e
 * capacidade 4 (igual às docas do Galpão 1/2), em vez de
 * "posicao" com 1 nível.
 * ============================================================ */

function buildMeioBlock(offsetX: number, offsetY: number, codePrefix: string): BuiltBlock {
    let seq = 0;
    const defs: DockDefinition[] = [];
    const rooms: WarehouseRoom[] = [];

    const startX = offsetX + MARGIN_X;
    let cursorY = offsetY + 70;

    function cell(rua: string, x: number, y: number, w: number, h: number, customShort?: string): DockDefinition {
        seq += 1;
        const code = `${codePrefix}${String(seq).padStart(3, "0")}`;
        return {
            code,
            type: "doca",
            label: code,
            shortLabel: customShort || String(seq),
            galpao: 0,
            rua,
            x,
            y,
            width: w,
            height: h,
            defaultCapacity: 4,
            levels: default4Levels(),
        };
    }

    const totalBlockW = TOTAL_W;
    const topColWidth = (totalBlockW - 3 * GAP) / 4;

    /* ---------- TOPO ---------- */
    for (let i = 0; i < 4; i++) {
        defs.push(cell("RUA 026", startX + i * (topColWidth + GAP), cursorY, topColWidth, 120, "01"));
    }
    cursorY += 120 + GAP;

    /* ---------- RUA 026 ---------- */
    rooms.push({ id: `${codePrefix}-rua-026`, x: startX, y: cursorY, width: totalBlockW, height: BAND_H, label: "RUA 026", isStreet: true });
    cursorY += BAND_H + GAP;

    const contentTopY = cursorY;
    const rowHeight = COL_H;

    const bottomColW = 130;
    const leftX = startX;
    const rightX = startX + totalBlockW - bottomColW;

    const centerGroupW = bottomColW * 2 + GAP;
    const centerX = startX + (totalBlockW - centerGroupW) / 2;

    const rowLabels = ["08", "09", "10", "11", "12", "13", "14", "14", "14", "14"];
    const totalRows = 10;

    for (let r = 0; r < totalRows; r++) {
        const lbl = rowLabels[r];
        const currentY = contentTopY + r * (rowHeight + GAP);

        if (r <= 5 || r === 7 || r === 9) {
            defs.push(cell("RUA 026", leftX, currentY, bottomColW, rowHeight, lbl));
        } else {
            rooms.push({ id: `${codePrefix}-gap-esq-${r}`, x: leftX, y: currentY, width: bottomColW, height: rowHeight, label: "", isStreet: true });
        }

        defs.push(cell("RUA 026", centerX, currentY, bottomColW, rowHeight, lbl));
        defs.push(cell("RUA 026", centerX + bottomColW + GAP, currentY, bottomColW, rowHeight, lbl));

        defs.push(cell("RUA 026", rightX, currentY, bottomColW, rowHeight, lbl));
    }

    const totalHeightDown = totalRows * (rowHeight + GAP) - GAP;

    rooms.push({
        id: `${codePrefix}-corredor-esq`, x: leftX + bottomColW, y: contentTopY, width: centerX - (leftX + bottomColW), height: totalHeightDown, label: "", isStreet: true,
    });

    rooms.push({
        id: `${codePrefix}-corredor-dir`, x: centerX + centerGroupW, y: contentTopY, width: rightX - (centerX + centerGroupW), height: totalHeightDown, label: "", isStreet: true,
    });

    cursorY = contentTopY + totalHeightDown + 20;

    const blockWidth = totalBlockW + MARGIN_X * 2;
    const blockHeight = cursorY - offsetY;

    rooms.unshift({ id: `${codePrefix}-header`, x: offsetX + 10, y: offsetY + 10, width: blockWidth - 20, height: 45, fill: "#1e293b", label: "GALPÃO MEIO" });
    rooms.unshift({ id: `${codePrefix}-outline`, x: offsetX + 10, y: offsetY + 10, width: blockWidth - 20, height: blockHeight, fill: "#f8fafc", stroke: "#e2e8f0" });

    return { defs, rooms, width: blockWidth, height: blockHeight };
}

/* ============================================================
 * FÁBRICA DO GALPÃO 2
 *
 * Reproduz a estrutura da referência visual (GALPAO_COMPLETO):
 *  - Linha de 8 posições no topo + faixa larga "RUA 25"
 *  - Zona superior com duas colunas paralelas de ruas:
 *      esquerda 4 posições/linha (RUA 024 -> 019),
 *      direita 3 posições/linha (RUA 024 -> 017)
 *  - Esquerda muda para grade fina de 7 posições/linha
 *    (RUA 016 -> 015 -> 014 -> 014, repetida)
 *  - As duas colunas se sincronizam num único ponto (sem barra
 *    preta — só uma faixa de rua normal) antes da zona inferior
 *  - Zona inferior: esquerda em 7 colunas (RUA 008 -> RUA 001),
 *    direita em 3 colunas (RUA 012 -> RUA 009). Como a direita
 *    tem menos ruas que a esquerda nessa zona, as DOCAS continuam
 *    com o MESMO tamanho (mesma COL_H/COL_W do Galpão 1) — só a
 *    altura das FAIXAS DE RUA entre os grupos da direita é
 *    calculada para que a última posição da direita termine
 *    exatamente na mesma altura que a última da esquerda.
 *  - No fim, o bloco inteiro é reescalado para o mesmo tamanho
 *    (largura/altura) do Galpão 1.
 *
 * IMPORTANTE: toda a coluna esquerda da zona inferior (grade fina
 * de 7 colunas — RUA 016 até RUA 001) é pallet/porta-pallet, não
 * posição comum. Por isso `cell()`/`drawLeftRows()`/`drawRightRows()`
 * aceitam um parâmetro de tipo, e as chamadas de `leftThinData` e
 * `leftBottomData` passam "doca" explicitamente.
 * ============================================================ */

function buildGalpao2Block(
    galpaoNum: number,
    codePrefix: string,
    docaPrefix: string,
    offsetX: number,
    offsetY: number,
    headerLabel: string
): BuiltBlock {
    let seq = 0;
    const defs: DockDefinition[] = [];
    const rooms: WarehouseRoom[] = [];

    const startX = offsetX + MARGIN_X;
    let cursorY = offsetY + 70;

    function cell(
        rua: string,
        x: number,
        y: number,
        w: number,
        h: number,
        customShort?: string,
        type: PositionType = "posicao"
    ): DockDefinition {
        seq += 1;
        const code = `${codePrefix}${String(seq).padStart(3, "0")}`;
        const isPallet = type === "doca";
        return {
            code,
            type,
            label: code,
            shortLabel: customShort || String(seq),
            galpao: galpaoNum,
            rua,
            x,
            y,
            width: w,
            height: h,
            defaultCapacity: isPallet ? 4 : 1,
            levels: isPallet ? default4Levels() : default1Level(),
        };
    }

    const LEFT_COLS_UPPER = 4;
    const LEFT_COLS_LOWER = 7;
    const RIGHT_COLS = 3;

    // Reaproveita EXATAMENTE as constantes de grade do Galpão 1
    // (COL_W, COL_H, GAP): assim toda posição comum tem o mesmo
    // tamanho nos dois galpões.
    const LEFT_W = LEFT_WIDTH; // 7 colunas de COL_W, igual ao Galpão 1
    const RIGHT_W = RIGHT_COLS * COL_W + (RIGHT_COLS - 1) * GAP;
    const CORRIDOR_WIDTH = CORRIDOR_W;
    const TOTAL_W2 = LEFT_W + CORRIDOR_WIDTH + RIGHT_W + GAP * 2;
    const RIGHT_START_X = startX + LEFT_W + GAP + CORRIDOR_WIDTH + GAP;

    const TOP_H = COL_H * 2;
    const ROW_H = COL_H * 1.5; // zona superior (blocos maiores)
    const THIN_ROW_H = COL_H; // zona inferior (mesma altura de posição do Galpão 1)
    const STREET_H = BAND_H_SM;
    const STREET_H_TOP = BAND_H;

    function leftColW(cols: number) {
        return (LEFT_W - (cols - 1) * GAP) / cols;
    }
    const rightColW = (RIGHT_W - (RIGHT_COLS - 1) * GAP) / RIGHT_COLS;

    let lY = 0;
    let rY = 0;

    function drawLeftRows(cols: number, rows: number, rowH: number, rua: string, type: PositionType = "posicao") {
        const w = leftColW(cols);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                defs.push(cell(rua, startX + c * (w + GAP), lY, w, rowH, String(cols - c).padStart(2, "0"), type));
            }
            lY += rowH + GAP;
        }
    }

    function drawRightRows(rows: number, rowH: number, rua: string, type: PositionType = "posicao") {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < RIGHT_COLS; c++) {
                defs.push(cell(rua, RIGHT_START_X + c * (rightColW + GAP), rY, rightColW, rowH, String(RIGHT_COLS - c).padStart(2, "0"), type));
            }
            rY += rowH + GAP;
        }
    }

    function leftStreetBand(label: string, height = STREET_H) {
        rooms.push({ id: `${codePrefix}-l-band-${lY}`, x: startX, y: lY, width: LEFT_W, height, label, isStreet: true });
        lY += height + GAP;
    }

    function rightStreetBand(label: string, height = STREET_H) {
        rooms.push({ id: `${codePrefix}-r-band-${rY}`, x: RIGHT_START_X, y: rY, width: RIGHT_W, height, label, isStreet: true });
        rY += height + GAP;
    }

    // Dado um conjunto de grupos (linhas fixas em rowH), calcula a
    // altura de faixa de rua necessária ENTRE os grupos (sem faixa
    // depois do último) para que a altura total bata exatamente com
    // targetHeight — usado para esticar só as ruas do lado direito,
    // nunca as docas.
    function requiredBandHeight(
        steps: { count: number }[],
        rowH: number,
        gap: number,
        targetHeight: number
    ): number {
        const totalRows = steps.reduce((sum, s) => sum + s.count, 0);
        const bandsCount = steps.length - 1;
        const rowsHeight = totalRows * (rowH + gap);
        if (bandsCount <= 0) return STREET_H;
        const raw = (targetHeight - rowsHeight - bandsCount * gap) / bandsCount;
        return Math.max(10, raw);
    }

    /* ---------- TOPO: linha única de 8 posições ---------- */
    const topW = (TOTAL_W2 - 7 * GAP) / 8;
    for (let i = 0; i < 8; i++) {
        defs.push(cell("RUA 025", startX + i * (topW + GAP), cursorY, topW, TOP_H, String(8 - i).padStart(2, "0")));
    }
    cursorY += TOP_H + GAP;

    /* ---------- FAIXA "RUA 25" ---------- */
    rooms.push({ id: `${codePrefix}-rua-25`, x: startX, y: cursorY, width: TOTAL_W2, height: STREET_H_TOP, label: "RUA 25", isStreet: true });
    cursorY += STREET_H_TOP + GAP;

    lY = cursorY;
    rY = cursorY;

    /* ---------- ZONA SUPERIOR (4 colunas à esquerda / 3 à direita) ---------- */

    // Primeira linha, sem rótulo próprio (fica logo abaixo da RUA 25).
    drawLeftRows(LEFT_COLS_UPPER, 1, ROW_H, "RUA 025");
    leftStreetBand("");

    drawRightRows(1, ROW_H, "RUA 025");
    rightStreetBand("");

    const leftUpperData: { count: number; rua: string }[] = [
        { count: 2, rua: "RUA 024" },
        { count: 2, rua: "RUA 023" },
        { count: 2, rua: "RUA 022" },
        { count: 2, rua: "RUA 021" },
        { count: 2, rua: "RUA 020" },
        { count: 1, rua: "RUA 019" },
    ];
    for (const step of leftUpperData) {
        drawLeftRows(LEFT_COLS_UPPER, step.count, ROW_H, step.rua);
        leftStreetBand(step.rua);
    }

    const rightUpperData: { count: number; rua: string }[] = [
        { count: 2, rua: "RUA 024" },
        { count: 2, rua: "RUA 023" },
        { count: 2, rua: "RUA 022" },
        { count: 2, rua: "RUA 021" },
        { count: 2, rua: "RUA 020" },
        { count: 2, rua: "RUA 019" },
        { count: 2, rua: "RUA 018" },
        { count: 1, rua: "RUA 017" },
    ];
    for (const step of rightUpperData) {
        drawRightRows(step.count, ROW_H, step.rua);
        rightStreetBand(step.rua);
    }

    /* ---------- ZONA INTERMEDIÁRIA ESQUERDA: grade fina de 7 colunas ----------
     * RUA 016 continua sendo posição comum, igual ao layout original.
     * Só RUA 015 e RUA 014 (as duas linhas) viram pallet/porta-pallet,
     * conforme pedido.
     */
    drawLeftRows(LEFT_COLS_LOWER, 1, THIN_ROW_H, "RUA 016");
    leftStreetBand("RUA 016");

    const leftThinPalletData: { count: number; rua: string }[] = [
        { count: 2, rua: "RUA 015" },
        { count: 2, rua: "RUA 014" },
        { count: 1, rua: "RUA 014" },
    ];
    for (const step of leftThinPalletData) {
        drawLeftRows(LEFT_COLS_LOWER, step.count, THIN_ROW_H, step.rua, "doca");
        leftStreetBand(step.rua);
    }

    /* ---------- SINCRONIZAÇÃO ENTRE AS DUAS METADES (sem barra preta) ----------
     * Ambas as colunas continuam a partir da mesma altura. Em vez de um
     * bloco preto sólido, é só uma faixa de rua comum (cinza), do
     * tamanho de uma rua normal.
     */
    const syncY = Math.max(lY, rY);
    rooms.push({ id: `${codePrefix}-sync`, x: startX, y: syncY, width: TOTAL_W2, height: STREET_H, label: "", isStreet: true });
    lY = syncY + STREET_H + GAP;
    rY = syncY + STREET_H + GAP;
    const bottomStartY = lY;

    /* ---------- ZONA INFERIOR ESQUERDA: RUA 008 -> RUA 001 (7 colunas) ----------
     * Toda esta faixa também é pallet/porta-pallet.
     */
    const leftBottomData: { count: number; rua: string }[] = [
        { count: 2, rua: "RUA 008" },
        { count: 2, rua: "RUA 007" },
        { count: 2, rua: "RUA 006" },
        { count: 2, rua: "RUA 005" },
        { count: 2, rua: "RUA 004" },
        { count: 2, rua: "RUA 003" },
        { count: 2, rua: "RUA 002" },
        { count: 2, rua: "RUA 001" },
    ];
    leftBottomData.forEach((step, idx) => {
        drawLeftRows(LEFT_COLS_LOWER, step.count, THIN_ROW_H, step.rua, "doca");
        if (idx < leftBottomData.length - 1) leftStreetBand(step.rua);
    });
    const leftBottomHeight = lY - bottomStartY;

    /* ---------- ZONA INFERIOR DIREITA: RUA 012 -> RUA 009 (3 colunas) ----------
     * As docas usam a MESMA altura THIN_ROW_H da esquerda (não são
     * aumentadas). Só a faixa de rua entre os grupos é recalculada
     * (requiredBandHeight) para que a última posição bata exatamente
     * na mesma altura que a última da esquerda.
     */
    const rightBottomData: { count: number; rua: string }[] = [
        { count: 2, rua: "RUA 012" },
        { count: 2, rua: "RUA 011" },
        { count: 2, rua: "RUA 010" },
        { count: 1, rua: "RUA 009" },
    ];
    const rightBandH = requiredBandHeight(rightBottomData, THIN_ROW_H, GAP, leftBottomHeight);

    rightBottomData.forEach((step, idx) => {
        drawRightRows(step.count, THIN_ROW_H, step.rua);
        if (idx < rightBottomData.length - 1) rightStreetBand(step.rua, rightBandH);
    });

    /* ---------- CORREDOR CENTRAL ---------- */
    const corridorTopY = cursorY;
    const maxY = Math.max(lY, rY);
    rooms.push({
        id: `${codePrefix}-corredor-central`,
        x: startX + LEFT_W + GAP,
        y: corridorTopY,
        width: CORRIDOR_WIDTH,
        height: maxY - corridorTopY,
        label: "RUA",
        vertical: true,
        isStreet: true,
    });

    const blockWidth = TOTAL_W2 + MARGIN_X * 2;
    const blockHeight = maxY - offsetY + 40;

    rooms.unshift({ id: `${codePrefix}-header`, x: offsetX + 10, y: offsetY + 10, width: blockWidth - 20, height: 45, fill: "#1e293b", label: headerLabel });
    rooms.unshift({ id: `${codePrefix}-outline`, x: offsetX + 10, y: offsetY + 10, width: blockWidth - 20, height: blockHeight, fill: "#f8fafc", stroke: "#e2e8f0" });

    return { defs, rooms, width: blockWidth, height: blockHeight };
}

/* ============================================================
 * MONTAGEM FINAL
 * ============================================================ */

const GALPAO_GAP = 60;

const galpao1Block = buildGalpao1Block(1, "G1-P", "DOCA", 0, 0, "GALPÃO 01 - ARMAZÉM PRINCIPAL");

const meioBlock = buildMeioBlock(
    galpao1Block.width + GALPAO_GAP,
    0,
    "GM-P"
);

const galpao2OffsetX = galpao1Block.width + GALPAO_GAP + meioBlock.width + GALPAO_GAP;

let galpao2Block = buildGalpao2Block(
    2,
    "G2-P",
    "DOCA2",
    galpao2OffsetX,
    0,
    "GALPÃO 02 - ARMAZÉM"
);

// Força o Galpão 2 a ter EXATAMENTE a mesma largura e altura do
// Galpão 1, reescalando o bloco inteiro (posições + ruas) em torno
// do seu próprio canto superior esquerdo — a posição dele no mapa
// (offsetX/offsetY) não muda, só o tamanho interno.
galpao2Block = scaleBuiltBlock(galpao2Block, galpao2OffsetX, 0, galpao1Block.width, galpao1Block.height);

/* ============================================================
 * EXPORTAÇÕES OBRIGATÓRIAS
 * ============================================================ */

export const DOCK_DEFINITIONS: DockDefinition[] = [
    ...galpao1Block.defs,
    ...meioBlock.defs,
    ...galpao2Block.defs,
];

export const GALPAO_1_POSITIONS = galpao1Block.defs;
export const GALPAO_2_POSITIONS = galpao2Block.defs;
export const GALPAO_MEIO_POSITIONS = meioBlock.defs;

export function getDockDefinition(code: string): DockDefinition | undefined {
    return DOCK_DEFINITIONS.find((d) => d.code === code || d.shortLabel === code);
}

export const WAREHOUSE_ROOMS: WarehouseRoom[] = [
    ...galpao1Block.rooms,
    ...meioBlock.rooms,
    ...galpao2Block.rooms,
];

export const WAREHOUSE_VIEWBOX = {
    width: galpao1Block.width + GALPAO_GAP + meioBlock.width + GALPAO_GAP + galpao2Block.width,
    height: Math.max(galpao1Block.height, meioBlock.height, galpao2Block.height) + 40,
};

export const TOWEL_CATEGORY = "Toalha e lenços";

export const TOWEL_DOCK_CODES: string[] = DOCK_DEFINITIONS
    .filter((d) => d.type === "doca")
    .map((d) => d.code);

export const MERCHANDISE_DOCK_CODES: string[] = DOCK_DEFINITIONS
    .filter((d) => d.type === "posicao")
    .map((d) => d.code);

const ALL_DOCK_CODES: string[] = DOCK_DEFINITIONS.map((d) => d.code);

function normalizeCategory(value: string): string {
    return (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

const NORMALIZED_TOWEL_CATEGORY = normalizeCategory(TOWEL_CATEGORY);

export function getAllowedDockCodes(category: string): string[] {
    const isTowel = normalizeCategory(category) === NORMALIZED_TOWEL_CATEGORY;
    const codes = isTowel ? TOWEL_DOCK_CODES : MERCHANDISE_DOCK_CODES;
    return codes.length > 0 ? codes : ALL_DOCK_CODES;
}

export function isDockAllowedForCategory(dockCode: string, category: string): boolean {
    if (!dockCode) return true;
    return getAllowedDockCodes(category).includes(dockCode);
}