/* ═══════════════ RICETTE GRID ═══════════════ */
.ricette-group         { margin-bottom: 28px; }
.ricette-group-title   {
  font-size: .78em; font-weight: 800; color: var(--text-light);
  text-transform: uppercase; letter-spacing: .06em;
  margin-bottom: 10px; display: flex; align-items: center; gap: 6px;
}
.ricette-grid-inner {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

/* ── Card ── */
.ricetta-card {
  background: var(--bg-card); border-radius: var(--radius);
  border: 1.5px solid var(--border); box-shadow: var(--shadow);
  padding: 14px 14px 12px;
  display: flex; gap: 12px; align-items: flex-start;
  cursor: pointer; transition: border-color .2s, box-shadow .2s;
}
.ricetta-card:hover { border-color: var(--primary); box-shadow: var(--shadow-lg); }
.ricetta-card-custom { border-left: 3px solid var(--primary); }

.rc-icon { font-size: 1.9em; flex-shrink: 0; line-height: 1; margin-top: 2px; }
.rc-body { flex: 1; min-width: 0; }
.rc-name {
  font-size: .88em; font-weight: 800; line-height: 1.3;
  margin-bottom: 5px; color: var(--text);
}
.rc-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 5px; }
.rc-ings   { font-size: .73em; color: var(--text-light); line-height: 1.4; }

/* ── Badge ── */
.rcb {
  display: inline-block; font-size: .65em; font-weight: 800;
  padding: 2px 7px; border-radius: 10px; white-space: nowrap;
}
.rcb-pasto   { background: var(--primary-light); color: var(--primary); }
.rcb-custom  { background: #fff3cd; color: #7a5800; }
.rcb-avail   { background: #d4edda; color: #155724; }
.rcb-partial { background: #fff3cd; color: #7a5800; }
.rcb-missing { background: var(--bg-light); color: var(--text-light); }

/* ═══════════════ MODAL DETTAGLIO ═══════════════ */
.rm-header-inner {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 14px;
}
.rm-icon       { font-size: 2.4em; flex-shrink: 0; }
.rm-title-text { font-size: 1.05em; font-weight: 800; line-height: 1.3; }
.rm-pasto-badge {
  display: inline-block; font-size: .72em; font-weight: 700;
  background: var(--primary-light); color: var(--primary);
  padding: 2px 8px; border-radius: 10px; margin-top: 4px;
}

/* Barra disponibilità */
.rm-avail-row {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 16px;
}
.rm-avail-bar-wrap {
  flex: 1; height: 6px; background: var(--border);
  border-radius: 3px; overflow: hidden;
}
.rm-avail-bar { height: 100%; border-radius: 3px; transition: width .5s; }
.rm-avail-label { font-size: .76em; font-weight: 800; white-space: nowrap; }

/* Sezione titolo */
.rm-section-title {
  font-size: .78em; font-weight: 800; color: var(--text-light);
  text-transform: uppercase; letter-spacing: .06em;
  margin: 14px 0 8px;
}

/* Lista ingredienti */
.rm-ing-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 5px; }
.rm-ing-item {
  display: flex; align-items: center; gap: 8px;
  font-size: .86em; padding: 6px 10px;
  border-radius: var(--radius-xs); border: 1px solid var(--border);
  background: var(--bg-light);
}
.rm-ing-ok { background: #f0faf4; border-color: #b7dfc8; }
.rm-ing-ko { background: var(--bg-light); }

.rm-ing-check { font-size: .8em; width: 16px; flex-shrink: 0; }
.rm-ing-ok .rm-ing-check { color: var(--primary); }
.rm-ing-ko .rm-ing-check { color: var(--text-light); }
.rm-ing-name { flex: 1; font-weight: 600; }
.rm-qty { color: var(--text-light); font-size: .9em; }

/* Preparazione */
.rm-prep {
  font-size: .86em; line-height: 1.7;
  color: var(--text-mid); white-space: pre-line;
}

/* ═══════════════ CUSTOM RICETTA ITEM ═══════════════ */
.custom-ricetta-item {
  background: var(--bg-card); border-radius: var(--radius);
  border: 1px solid var(--border); box-shadow: var(--shadow-sm);
  padding: 14px 14px 12px; margin-bottom: 10px;
}
.cri-header  { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.cri-icon-name { display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; }
.cri-icon    { font-size: 1.6em; }
.cri-name    { font-size: .9em; font-weight: 800; }
.cri-pasto   { font-size: .73em; color: var(--primary); font-weight: 700; margin-top: 2px; }
.cri-actions { display: flex; gap: 6px; flex-shrink: 0; }
.cri-ings    { font-size: .78em; color: var(--text-light); margin-bottom: 6px; line-height: 1.5; }
.cri-prep    { font-size: .8em; color: var(--text-mid); line-height: 1.6; }
.btn-danger  {
  background: var(--danger, #e05252); color: #fff; border-color: transparent;
}
.btn-danger:hover { filter: brightness(.9); }
