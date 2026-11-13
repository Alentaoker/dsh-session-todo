window.__ModuleLoader__.load({
  id: 'dsh-session-todo-desktop2',
  factory(require) {
    const React = require('react')
    const ReactDOM = require('react-dom')
    const { Menu: HostMenu, MenuItemButton: HostMenuItemButton, IconChecklistOutlineRegular } = require('@deepseek-ai/dsh-client-ui-primitives')
    const {
      createElement: h,
      useCallback,
      useEffect,
      useMemo,
      useRef,
      useState,
      useSyncExternalStore,
    } = React
    const { createPortal } = ReactDOM

    const CHANNEL = '/dsh-session-todo-desktop2'
    const TODO_ICON = 'M9 5.5 10.8 7.3 14.2 3.8 M9 11.5 10.8 13.3 14.2 9.8 M9 17.5 10.8 19.3 14.2 15.8 M18 6h-1 M18 12h-1 M18 18h-1'
    const THEME_TOKENS = [
      '--dsw-alias-bg-base',
      '--dsw-alias-bg-layer-1',
      '--dsw-alias-bg-layer-2',
      '--dsw-alias-bg-overlay',
      '--dsw-alias-border-l1',
      '--dsw-alias-border-l2',
      '--dsw-alias-brand-primary',
      '--dsw-alias-label-primary',
      '--dsw-alias-label-secondary',
      '--dsw-alias-state-error-primary',
      '--dsw-alias-state-idle-primary',
      '--dsw-alias-state-success-primary',
      '--dsw-alias-state-warn-primary',
      '--dsw-specific-sidebar-fill',
      '--dsh-content-font-size',
    ]

    const CSS = `
      .dst-root { color-scheme: dark; }
      .dst-pip-body { margin: 0; overflow: hidden; background: var(--dsw-alias-bg-base, #17191d); }
      .dst-panel {
        --dst-bg: var(--dsw-alias-bg-base, #17191d);
        --dst-layer: var(--dsw-alias-bg-layer-1, #1f2228);
        --dst-layer2: var(--dsw-alias-bg-layer-2, #262a31);
        --dst-overlay: var(--dsw-alias-bg-overlay, #24282f);
        --dst-border: var(--dsw-alias-border-l1, #343941);
        --dst-border2: var(--dsw-alias-border-l2, #4b525c);
        --dst-text: var(--dsw-alias-label-primary, #e7e9ed);
        --dst-muted: var(--dsw-alias-label-secondary, #9ba1ab);
        --dst-brand: var(--dsw-alias-brand-primary, #7da6e8);
        --dst-error: var(--dsw-alias-state-error-primary, #e07a76);
        --dst-warn: var(--dsw-alias-state-warn-primary, #d6a451);
        --dst-success: var(--dsw-alias-state-success-primary, #7cc59a);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: 400px;
        height: 620px;
        max-width: 100vw;
        max-height: 100vh;
        overflow: hidden;
        border: 1px solid var(--dst-border);
        border-radius: 14px;
        background: var(--dst-bg);
        color: var(--dst-text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif;
        font-size: 13px;
        line-height: 1.45;
        box-shadow: 0 18px 60px rgba(0, 0, 0, .42);
      }
      .dst-panel--pip { width: 100%; height: 100vh; max-width: none; max-height: none; border: 0; border-radius: 0; box-shadow: none; }
      .dst-header { display: flex; align-items: center; gap: 10px; min-height: 54px; padding: 10px 12px 8px 14px; border-bottom: 1px solid var(--dst-border); }
      .dst-header--draggable { cursor: move; user-select: none; }
      .dst-title-wrap { min-width: 0; flex: 1; }
      .dst-title { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 15px; font-weight: 650; letter-spacing: .01em; }
      .dst-title svg { color: var(--dst-warn); flex: none; }
      .dst-subtitle { margin-top: 2px; color: var(--dst-muted); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .dst-header-actions { display: flex; align-items: center; gap: 4px; flex: none; }
      .dst-icon-button { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--dst-muted); cursor: pointer; }
      .dst-icon-button:hover { background: var(--dst-layer2); color: var(--dst-text); }
      .dst-icon-button:focus-visible, .dst-button:focus-visible, .dst-nav:focus-visible, .dst-title-button:focus-visible, .dst-check:focus-visible, .dst-footer-action:focus-visible, .dst-header-add:focus-visible, .dst-tab:focus-visible, .dst-group-menu-button:focus-visible, .dst-link:focus-visible, .dst-menu button:focus-visible { outline: 2px solid var(--dst-brand); outline-offset: 1px; }
      .dst-button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 28px; padding: 0 9px; border: 1px solid var(--dst-border); border-radius: 7px; background: var(--dst-layer); color: var(--dst-text); font: inherit; font-size: 12px; cursor: pointer; white-space: nowrap; }
      .dst-button:hover { background: var(--dst-layer2); border-color: var(--dst-border2); }
      .dst-button:disabled { opacity: .55; cursor: default; }
      .dst-button--primary { color: #17191d; border-color: var(--dst-warn); background: var(--dst-warn); font-weight: 600; }
      .dst-button--primary:hover { background: #e3b765; border-color: #e3b765; }
      .dst-button--danger { color: var(--dst-error); border-color: color-mix(in srgb, var(--dst-error) 38%, var(--dst-border)); }
      .dst-toolbar { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--dst-border); }
      .dst-select, .dst-search { box-sizing: border-box; height: 30px; border: 1px solid var(--dst-border); border-radius: 7px; background: var(--dst-layer); color: var(--dst-text); font: inherit; font-size: 12px; }
      .dst-select { width: 126px; min-width: 0; padding: 0 6px; }
      .dst-search { flex: 1; min-width: 0; padding: 0 9px; }
      .dst-select:focus, .dst-search:focus { outline: 2px solid var(--dst-brand); outline-offset: 0; border-color: transparent; }
      .dst-tabs { display: flex; align-items: stretch; padding: 0 12px; border-bottom: 1px solid var(--dst-border); }
      .dst-tab { flex: 1; min-width: 0; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--dst-muted); font: inherit; font-size: 12.5px; cursor: pointer; }
      .dst-tab:hover { color: var(--dst-text); }
      .dst-tab.is-active { color: var(--dst-text); border-bottom-color: var(--dst-warn); font-weight: 600; }
      .dst-count { display: inline-flex; align-items: center; justify-content: center; min-width: 17px; height: 17px; padding: 0 5px; border-radius: 9px; background: var(--dst-layer2); color: var(--dst-muted); font-size: 10.5px; font-variant-numeric: tabular-nums; }
      .dst-tab.is-active .dst-count { color: var(--dst-text); background: color-mix(in srgb, var(--dst-warn) 22%, var(--dst-layer2)); }
      .dst-tab-extra { flex: none; display: flex; align-items: center; padding-left: 4px; }
      .dst-content { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 8px 0 12px; }
      .dst-content::-webkit-scrollbar { width: 8px; }
      .dst-content::-webkit-scrollbar-thumb { background: var(--dst-border2); border-radius: 8px; border: 2px solid var(--dst-bg); }
      .dst-banner { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 8px 12px 0; padding: 7px 9px; border: 1px solid var(--dst-border); border-radius: 8px; background: var(--dst-layer); color: var(--dst-muted); font-size: 11.5px; }
      .dst-banner--warn { border-color: color-mix(in srgb, var(--dst-warn) 42%, var(--dst-border)); color: var(--dst-warn); }
      .dst-banner--error { border-color: color-mix(in srgb, var(--dst-error) 45%, var(--dst-border)); color: var(--dst-error); }
      .dst-banner .dst-button { min-height: 24px; padding: 0 7px; font-size: 11px; }
      .dst-section-note { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 7px 14px 4px; color: var(--dst-muted); font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; }
      .dst-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 190px; padding: 26px 34px; color: var(--dst-muted); text-align: center; }
      .dst-empty svg { color: var(--dst-border2); }
      .dst-empty-title { color: var(--dst-text); font-size: 13px; font-weight: 600; }
      .dst-empty-copy { font-size: 11.5px; line-height: 1.6; }
      .dst-group { margin-top: 6px; }
      .dst-group-head { display: flex; align-items: center; gap: 7px; min-height: 30px; margin: 0 10px; padding: 0 4px; }
      .dst-group-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dst-group); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dst-group) 16%, transparent); flex: none; }
      .dst-group-name { min-width: 0; flex: 1; color: var(--dst-group); font-size: 11.5px; font-weight: 650; letter-spacing: .04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .dst-group-count { color: var(--dst-muted); font-size: 10.5px; font-variant-numeric: tabular-nums; }
      .dst-group-menu-button { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--dst-muted); cursor: pointer; }
      .dst-group-menu-button:hover { background: var(--dst-layer); color: var(--dst-text); }
      .dst-group-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 0 14px 7px; padding: 6px; border: 1px solid var(--dst-border); border-radius: 8px; background: var(--dst-layer); }
      .dst-group-tools .dst-button { min-height: 24px; padding: 0 7px; font-size: 11px; }
      .dst-color { width: 28px; height: 25px; padding: 1px; border: 1px solid var(--dst-border); border-radius: 6px; background: var(--dst-layer2); cursor: pointer; }
      .dst-card { box-sizing: border-box; margin: 0 12px 7px; padding: 9px 10px 8px; border: 1px solid var(--dst-border); border-left: 2px solid var(--dst-group, var(--dst-border2)); border-radius: 9px; background: var(--dst-layer); }
      .dst-card:hover { border-color: var(--dst-border2); border-left-color: var(--dst-group, var(--dst-border2)); }
      .dst-card.is-completed { opacity: .68; background: color-mix(in srgb, var(--dst-layer) 60%, var(--dst-bg)); }
      .dst-card.is-completed .dst-card-title { text-decoration: line-through; color: var(--dst-muted); }
      .dst-card.is-unread { border-left-color: var(--dst-warn); }
      .dst-card-top { display: flex; align-items: flex-start; gap: 8px; }
      .dst-check { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; margin-top: 1px; padding: 0; border: 1.5px solid var(--dst-border2); border-radius: 5px; background: transparent; color: var(--dst-text); cursor: pointer; }
      .dst-check:hover { border-color: var(--dst-warn); }
      .dst-check.is-checked { border-color: var(--dst-success); background: var(--dst-success); color: #17191d; }
      .dst-card-head { flex: 1; min-width: 0; }
      .dst-title-button { display: block; width: 100%; padding: 0; border: 0; background: transparent; color: var(--dst-text); font: inherit; font-size: 13px; font-weight: 600; line-height: 1.4; text-align: left; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dst-title-button:hover { color: var(--dst-brand); }
      .dst-title-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dst-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 7px; margin-top: 3px; color: var(--dst-muted); font-size: 10.5px; }
      .dst-meta-workspace { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dst-meta-sep { color: var(--dst-border2); }
      .dst-status { display: inline-flex; align-items: center; gap: 4px; flex: none; max-width: 100px; margin-top: 1px; color: var(--dst-muted); font-size: 10.5px; white-space: nowrap; }
      .dst-status--warn { color: var(--dst-warn); }
      .dst-status--error { color: var(--dst-error); }
      .dst-status--running { color: var(--dst-brand); }
      .dst-status--success { color: var(--dst-success); }
      .dst-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      .dst-spinner { width: 10px; height: 10px; border: 1.5px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: dst-spin .8s linear infinite; }
      @keyframes dst-spin { to { transform: rotate(360deg); } }
      .dst-note-preview { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; width: 100%; margin: 6px 0 0; padding: 0; border: 0; background: transparent; color: var(--dst-muted); font: inherit; font-size: 11.5px; line-height: 1.5; text-align: left; white-space: pre-wrap; cursor: pointer; }
      .dst-note-preview:hover { color: var(--dst-text); }
      .dst-add-note { margin-top: 5px; padding: 0; border: 0; background: transparent; color: var(--dst-muted); font: inherit; font-size: 10.5px; cursor: pointer; }
      .dst-add-note:hover { color: var(--dst-brand); }
      .dst-card-actions { display: flex; align-items: center; gap: 5px; margin-top: 7px; }
      .dst-card-actions .dst-button { min-height: 25px; padding: 0 7px; font-size: 11px; }
      .dst-card-actions-spacer { flex: 1; }
      .dst-link { padding: 0; border: 0; background: transparent; color: var(--dst-muted); font: inherit; font-size: 11px; cursor: pointer; }
      .dst-link:hover { color: var(--dst-text); }
      .dst-menu { margin-top: 7px; padding: 6px; border: 1px solid var(--dst-border); border-radius: 7px; background: var(--dst-layer2); }
      .dst-menu-row { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
      .dst-menu-row:last-child { margin-bottom: 0; }
      .dst-menu-row label { color: var(--dst-muted); font-size: 11px; white-space: nowrap; }
      .dst-menu-row select { flex: 1; min-width: 0; height: 26px; border: 1px solid var(--dst-border); border-radius: 5px; background: var(--dst-layer); color: var(--dst-text); font: inherit; font-size: 11px; }
      .dst-menu button { min-height: 25px; padding: 0 7px; border: 1px solid var(--dst-border); border-radius: 5px; background: var(--dst-layer); color: var(--dst-text); font: inherit; font-size: 11px; cursor: pointer; }
      .dst-menu button:hover { background: var(--dst-overlay); }
      .dst-menu button.danger { color: var(--dst-error); }
      .dst-note-editor { margin-top: 7px; padding: 7px; border: 1px solid var(--dst-border2); border-radius: 7px; background: var(--dst-layer2); }
      .dst-note-editor textarea { box-sizing: border-box; width: 100%; min-height: 76px; resize: vertical; padding: 7px 8px; border: 1px solid var(--dst-border); border-radius: 6px; background: var(--dst-layer); color: var(--dst-text); font: inherit; font-size: 12px; line-height: 1.55; }
      .dst-note-editor textarea:focus { outline: 2px solid var(--dst-brand); outline-offset: 0; border-color: transparent; }
      .dst-note-editor-footer { display: flex; align-items: center; gap: 5px; margin-top: 6px; }
      .dst-note-count { flex: 1; color: var(--dst-muted); font-size: 10.5px; font-variant-numeric: tabular-nums; }
      .dst-error-text { margin-top: 4px; color: var(--dst-error); font-size: 10.5px; }
      .dst-completed { margin-top: 12px; border-top: 1px solid var(--dst-border); padding-top: 3px; }
      .dst-completed-toggle { display: flex; align-items: center; gap: 5px; width: calc(100% - 24px); margin: 0 12px; padding: 7px 2px; border: 0; background: transparent; color: var(--dst-muted); font: inherit; font-size: 11px; text-align: left; cursor: pointer; }
      .dst-completed-toggle:hover { color: var(--dst-text); }
      .dst-completed-toggle svg { transition: transform .15s ease; }
      .dst-completed-toggle.is-open svg { transform: rotate(90deg); }
      .dst-new-group { display: flex; align-items: center; justify-content: center; gap: 5px; width: calc(100% - 24px); margin: 10px 12px 0; padding: 7px; border: 1px dashed var(--dst-border2); border-radius: 7px; background: transparent; color: var(--dst-muted); font: inherit; font-size: 11px; cursor: pointer; }
      .dst-new-group:hover { border-color: var(--dst-warn); color: var(--dst-warn); }
      .dst-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 30px; padding: 0 12px; border-top: 1px solid var(--dst-border); color: var(--dst-muted); font-size: 10px; }
      .dst-capability { display: inline-flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dst-capability-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dst-state-idle, var(--dst-muted)); flex: none; }
      .dst-capability.is-live .dst-capability-dot { background: var(--dst-success); }
      .dst-capability.is-fallback .dst-capability-dot { background: var(--dst-warn); }
      .dst-version { flex: none; color: var(--dst-border2); }
      .dst-floating-layer { position: fixed; z-index: 2147483000; width: 400px; height: 620px; pointer-events: none; }
      .dst-floating-layer .dst-panel { pointer-events: auto; }
      .dst-modal-backdrop { position: fixed; inset: 0; z-index: 2147483100; display: flex; align-items: center; justify-content: center; padding: 14px; background: rgba(8, 9, 11, .58); }
      .dst-modal { box-sizing: border-box; width: 320px; max-width: 100%; padding: 14px; border: 1px solid var(--dst-border2); border-radius: 11px; background: var(--dst-overlay, var(--dst-layer2)); color: var(--dst-text); box-shadow: 0 18px 50px rgba(0,0,0,.4); }
      .dst-modal-title { margin: 0 0 9px; font-size: 13px; font-weight: 650; }
      .dst-modal-copy { margin: 0 0 12px; color: var(--dst-muted); font-size: 12px; line-height: 1.6; white-space: pre-wrap; }
      .dst-modal-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 9px; color: var(--dst-muted); font-size: 11px; }
      .dst-modal-input { box-sizing: border-box; width: 100%; height: 31px; padding: 0 8px; border: 1px solid var(--dst-border); border-radius: 6px; background: var(--dst-layer); color: var(--dst-text); font: inherit; font-size: 12px; }
      .dst-modal-input:focus { outline: 2px solid var(--dst-brand); outline-offset: 0; border-color: transparent; }
      .dst-modal-color-row { display: flex; align-items: center; gap: 8px; }
      .dst-modal-color-row .dst-modal-input { flex: 1; }
      .dst-modal-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 13px; }
      .dst-toast { position: fixed; left: 50%; bottom: 18px; z-index: 2147483200; transform: translateX(-50%); max-width: 340px; padding: 7px 11px; border: 1px solid var(--dst-border2); border-radius: 8px; background: var(--dst-overlay, #24282f); color: var(--dst-text); font-size: 11.5px; box-shadow: 0 8px 28px rgba(0,0,0,.35); pointer-events: none; }
      .dst-toast--error { border-color: color-mix(in srgb, var(--dst-error) 50%, var(--dst-border2)); color: var(--dst-error); }
      .dst-footer-action { display: inline-flex; align-items: center; gap: 7px; min-width: 0; height: 32px; padding: 0 9px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-secondary, #9ba1ab); font: inherit; font-size: 12px; cursor: pointer; }
      .dst-footer-action:hover { background: var(--dsw-alias-bg-layer-1, #1f2228); color: var(--dsw-alias-label-primary, #e7e9ed); }
      .dst-footer-action.is-wide { width: 100%; justify-content: flex-start; }
      .dst-footer-action .dst-footer-badge { margin-left: auto; display: inline-flex; align-items: center; justify-content: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--dsw-alias-state-warn-primary, #d6a451); color: #17191d; font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums; }
      .dst-footer-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dst-header-add { display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l1, #343941); border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary, #9ba1ab); font: inherit; font-size: 11.5px; cursor: pointer; }
      .dst-header-add:hover { background: var(--dsw-alias-bg-layer-1, #1f2228); color: var(--dsw-alias-label-primary, #e7e9ed); }
      .dst-header-add:disabled { cursor: default; color: var(--dsw-alias-state-success-primary, #7cc59a); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #7cc59a) 35%, var(--dsw-alias-border-l1, #343941)); }
      .dst-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
      .dst-panel { width: 360px; height: 490px; border-radius: 14px; --dst-bg: #1c1d21; --dst-layer: #25262b; --dst-layer2: #2c2e34; --dst-border: #36383f; --dst-text: #eeeff1; --dst-muted: #92969f; --dst-warn: #d6af70; --dst-brand: #9ccab5; }
      .dst-header { min-height: 48px; box-sizing: border-box; padding: 8px 12px 8px 16px; border: 0; }
      .dst-title { font-size: 14px; } .dst-title svg { display: none; }
      .dst-toolbar { padding: 0 16px 8px; border: 0; order: 2; }
      .dst-select { width: 116px; border: 0; background: transparent; padding-left: 0; font-size: 10.5px; color: var(--dst-muted); }
      .dst-search { height: 27px; font-size: 11px; background: transparent; border-color: transparent; }
      .dst-search:focus { background: var(--dst-layer); }
      .dst-tabs { padding: 0 12px 9px; border: 0; gap: 4px; order: 1; }
      .dst-tab { flex: none; height: 29px; padding: 0 10px; border: 0; border-radius: 7px; font-size: 12px; }
      .dst-tab.is-active { background: var(--dst-layer2); }
      .dst-tab .dst-count { padding: 0; min-width: 10px; background: transparent; }
      .dst-tab-extra { margin-left: auto; }
      .dst-banner { order: 3; } .dst-content { order: 4; padding-top: 0; }
      .dst-card { margin: 0 6px 2px; padding: 10px; border: 0; background: transparent; border-radius: 8px; }
      .dst-card:hover, .dst-card:focus-within { background: var(--dst-layer); }
      .dst-card-title, .dst-title-button { font-size: 12.5px; font-weight: 500; }
      .dst-card-top { gap: 9px; align-items: flex-start; }
      .dst-card-top > .dst-icon-button { flex: none; width: 26px; height: 25px; margin-top: -3px; }
      .dst-check { width: 16px; height: 16px; margin-top: 2px; border-width: 1px; }
      .dst-meta { margin-top: 5px; font-size: 10px; }
      .dst-status { font-size: 9px; margin-top: 2px; max-width: 64px; overflow: hidden; }
      .dst-note-preview { display: block; margin: 6px 28px 0 25px; width: calc(100% - 53px); max-height: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #b4b8c0; padding: 0; border: 0; background: none; font-size: 11px; text-align: left; }
      .dst-group-head { margin: 4px 14px 0; min-height: 26px; }
      .dst-group-dot { width: 6px; height: 6px; box-shadow: none; }
      .dst-group-name { font-size: 10.5px; color: var(--dst-muted); font-weight: 500; letter-spacing: 0; }
      .dst-new-group { font-size: 10.5px; border: 0; margin: 10px 14px; }
      .dst-empty { min-height: 140px; } .dst-empty-copy { font-size: 11px; }
      .dst-group-strip { position: relative; display: flex; align-items: center; padding: 0 9px 8px; order: 3; gap: 3px; }
      .dst-group-rail { display: flex; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; gap: 5px; touch-action: pan-x; }
      .dst-group-tag { flex: none; padding: 5px 10px; border: 0; border-radius: 7px; background: transparent; color: var(--dst-muted); font: inherit; font-size: 11px; cursor: pointer; white-space: nowrap; }
      .dst-group-tag.is-active, .dst-group-tag:hover { color: var(--dst-text); background: var(--dst-layer2); }
      .dst-title-input { box-sizing: border-box; width: 100%; min-width: 0; padding: 2px 3px; border: 1px solid var(--dst-brand); border-radius: 3px; color: var(--dst-text); background: var(--dst-layer); font: inherit; font-size: 12.5px; }
      .dst-add-picker { display: inline-flex; position: relative; overflow: visible; }
      .dst-add-groups, .dst-group-context { position: absolute; z-index: 10000; top: 100%; left: 0; min-width: 150px; max-height: 280px; overflow-y: auto; padding: 5px; border: 1px solid var(--dsw-alias-border-l1, #3b3e46); border-radius: 8px; background: var(--dsw-alias-bg-overlay, #25262b); color: var(--dsw-alias-label-primary, #eee); box-shadow: 0 6px 18px #0004; }
      .dst-add-picker.is-side .dst-add-groups { top: 0; left: auto; right: 100%; }
      .dst-add-groups button, .dst-group-context button, .dst-topic-add { display: block; width: 100%; min-height: 30px; padding: 5px 10px; border: 0; border-radius: 5px; background: transparent; color: inherit; text-align: left; white-space: nowrap; font: inherit; font-size: 12px; cursor: pointer; }
      .dst-add-groups button:hover, .dst-group-context button:hover, .dst-topic-add:hover { background: var(--dsw-alias-bg-layer-2, #34373f); }
      .dst-group-context { top: 32px; left: 16px; }
      .dst-group-tag { display: inline-flex; align-items: center; gap: 6px; }
      .dst-group-color-dot { display: inline-block; flex: none; width: 6px; height: 6px; border-radius: 50%; }
      .dst-group-tag.is-active { background: color-mix(in srgb, var(--dst-tag-color) 16%, transparent); box-shadow: inset 0 -1px var(--dst-tag-color); }
      .dst-group-name-input { flex: none; width: 100px; min-width: 70px; padding: 4px 7px; border: 1px solid; border-radius: 5px; font: inherit; font-size: 11px; background: var(--dst-layer); color: var(--dst-text); }
      .dst-tag-count { font-size: 10px; opacity: .75; font-variant-numeric: tabular-nums; }
      .dst-native-topic-picker { display: block; width: 100%; }
      .dst-group-picker-label { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 16px; }
      div[role="menu"]:has(.dst-native-topic-picker) { overflow: visible !important; max-height: none !important; }
      div[role="menu"] > div[role="presentation"]:has(.dst-native-topic-picker) { overflow: visible !important; }
      .dst-native-topic-picker > div[role="menu"] { top: -4px; left: calc(100% + 4px); }
      @media (max-width: 380px) { .dst-panel { width: 100vw; height: 100vh; border-radius: 0; } .dst-select { width: 108px; } .dst-status { max-width: 78px; } }
    `

    let controller = null

    class RpcFailure extends Error {
      constructor(error) {
        super(error?.message || '请求失败')
        this.code = error?.code || 'rpc-failed'
      }
    }

    class TodoController {
      constructor(ctx) {
        this.ctx = ctx
        this.listeners = new Set()
        this.data = null
        this.loading = true
        this.error = null
        this.connectionState = ctx.connection?.state?.getSnapshot?.()
        this.pipWindow = null
        this.fallbackOpen = false
        this.nativeHelperAvailable = false
        this.helperOpen = false
        this.capability = this.pipAvailable() ? 'available' : 'unsupported'
        this.capabilityError = ''
        this.toast = null
        this.toastTimer = null
        this.pollTimer = null
        this.pipTimer = null
        this.loadingPromise = null
        this.disposed = false
        this.lastViewNonce = null
        this.lastRenameNonce = null
        this.navigationAbort = null
        this.eventSource = null
        this.eventsLive = false
        this.dataStamp = null
        this.refreshQueued = false
        this.snapshot = this.makeSnapshot()
      }

      makeSnapshot() {
        return {
          data: this.data,
          loading: this.loading,
          error: this.error,
          connectionState: this.connectionState,
          pipWindow: this.pipWindow,
          fallbackOpen: this.fallbackOpen,
          capability: this.capability,
          capabilityError: this.capabilityError,
          toast: this.toast,
        }
      }

      publish(patch) {
        if (this.disposed) return
        Object.assign(this, patch)
        this.snapshot = this.makeSnapshot()
        for (const listener of [...this.listeners]) {
          try { listener() } catch (error) { console.error('[dsh-session-todo] subscriber failed', error) }
        }
      }

      getSnapshot = () => this.snapshot
      subscribe = (listener) => {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
      }

      pipAvailable() {
        return typeof window !== 'undefined'
          && window.documentPictureInPicture !== undefined
          && typeof window.documentPictureInPicture.requestWindow === 'function'
      }

      start() {
        const disposeState = this.ctx.connection.state.subscribe(() => {
          const state = this.ctx.connection.state.getSnapshot()
          this.publish({ connectionState: state })
          if (state === 'connected') void this.load({ quiet: true })
        })
        this.connectionState = this.ctx.connection.state.getSnapshot()
        this.publish({ connectionState: this.connectionState })
        void this.load()
        this.pollTimer = window.setInterval(() => {
          if (this.eventsLive) return
          const pipOpen = Boolean(this.pipWindow && !this.pipWindow.closed)
          const helperOpen = this.helperOpen
          if ((document.visibilityState === 'visible' || pipOpen || helperOpen)
            && this.ctx.connection.state.getSnapshot() === 'connected') {
            void this.load({ quiet: true })
          }
        }, 2500)
        const onVisible = () => {
          if (document.visibilityState === 'visible') void this.load({ quiet: true })
        }
        const onFocus = () => { void this.load({ quiet: true }) }
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('focus', onFocus)
        return () => {
          this.disposed = true
          this.navigationAbort?.abort()
          this.eventSource?.close()
          this.eventSource = null
          this.eventsLive = false
          disposeState()
          document.removeEventListener('visibilitychange', onVisible)
          window.removeEventListener('focus', onFocus)
          if (this.pollTimer) window.clearInterval(this.pollTimer)
          if (this.toastTimer) window.clearTimeout(this.toastTimer)
          this.closeFloating({ silent: true })
        }
      }

      async call(endpoint, payload = {}) {
        const abort = new AbortController()
        const timer = window.setTimeout(() => abort.abort(), 15000)
        try {
          const response = await fetch(CHANNEL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ endpoint, payload }),
            credentials: 'same-origin',
            cache: 'no-store',
            signal: abort.signal,
          })
          if (!response.ok) throw new Error(`后台请求失败：HTTP ${response.status}`)
          const result = await response.json()
          if (!result || result.ok !== true) throw new RpcFailure(result?.error)
          const value = result.value
          if (value?.snapshot) this.applySnapshot(value.snapshot)
          return value
        } finally {
          window.clearTimeout(timer)
        }
      }

      applySnapshot(snapshot) {
        if (!snapshot || typeof snapshot !== 'object') return
        this.nativeHelperAvailable = snapshot.capabilities?.nativeHelper === true
        this.helperOpen = snapshot.capabilities?.helperOpen === true
        const stamp = JSON.stringify([snapshot.revision, snapshot.liveRevision, snapshot.workspaces, snapshot.capabilities, snapshot.viewRequest, snapshot.renameRequest])
        if (stamp !== this.dataStamp || this.loading || this.error) {
          this.dataStamp = stamp
          this.publish({ data: snapshot, loading: false, error: null })
        }
        if (snapshot.capabilities?.events) this.connectEvents()
        const rename = snapshot.renameRequest
        if (rename?.nonce && rename.nonce !== this.lastRenameNonce) {
          this.lastRenameNonce = rename.nonce
          void (async () => {
            try {
              if (Date.now() - rename.at > 15000) throw new Error('重命名请求已过期，请重试')
              const title = await this.renameSession(rename.sessionId, rename.title)
              if (!this.disposed) await this.call('session/rename/ack', { nonce: rename.nonce, success: true, title })
            } catch (error) {
              if (!this.disposed) await this.call('session/rename/ack', { nonce: rename.nonce, success: false, error: String(error.message || error).slice(0, 1000) }).catch(() => {})
            }
          })()
        }
        const request = snapshot.viewRequest
        if (request?.nonce && request.nonce !== this.lastViewNonce) {
          this.lastViewNonce = request.nonce
          this.navigationAbort?.abort()
          const navigation = new AbortController()
          this.navigationAbort = navigation
          const expired = !Number.isFinite(request.at) || Date.now() - request.at > 15000
          void (async () => {
            try {
              if (expired) throw new Error('跳转请求已过期，请重新点击会话')
              await this.navigateSession(request.sessionId, navigation.signal)
              if (!navigation.signal.aborted && !this.disposed) {
                await this.call('view/ack', { nonce: request.nonce, success: true })
              }
            } catch (error) {
              if (navigation.signal.aborted || this.disposed) return
              this.showToast(error.message || '打开会话失败', 'error')
              if (snapshot.capabilities?.navigationAck) {
                await this.call('view/ack', { nonce: request.nonce, success: false, error: String(error.message || error).slice(0, 1000) }).catch(() => {})
              }
            }
          })()
        }
      }

      connectEvents() {
        if (this.disposed || this.eventSource || typeof EventSource !== 'function') return
        const source = new EventSource(`${CHANNEL}/events`)
        this.eventSource = source
        source.onopen = () => { if (!this.disposed) this.eventsLive = true }
        source.onerror = () => { this.eventsLive = false }
        source.onmessage = (event) => {
          if (this.disposed) return
          try {
            const notice = JSON.parse(event.data)
            if (notice.revision !== this.data?.revision || notice.liveRevision !== this.data?.liveRevision || (notice.viewNonce && notice.viewNonce !== this.lastViewNonce) || (notice.renameNonce && notice.renameNonce !== this.lastRenameNonce)) void this.load({ quiet: true })
          } catch (error) { console.warn('[dsh-session-todo] event rejected', error) }
        }
      }

      async load(options = {}) {
        if (this.disposed) return
        if (this.loadingPromise) { this.refreshQueued = true; return this.loadingPromise }
        const quiet = options.quiet === true
        if (!quiet) this.publish({ loading: true, error: null })
        const run = this.call('snapshot')
          .then(() => {
            if (!quiet) this.publish({ loading: false })
          })
          .catch((error) => {
            const message = error?.name === 'AbortError' ? '读取超时' : (error?.message || String(error))
            this.publish({ loading: false, error: message })
          })
          .finally(() => {
            this.loadingPromise = null
            if (this.refreshQueued && !this.disposed) { this.refreshQueued = false; void this.load({ quiet: true }) }
          })
        this.loadingPromise = run
        return run
      }

      async addTask(sessionId, title, groupId) {
        const value = await this.call('task/add', { sessionId, title: title || '', groupId })
        const created = value?.outcome?.created === true
        this.showToast(created ? '已加入待办' : '已在待办中', created ? 'ok' : undefined)
        return created
      }

      async removeTask(sessionId) {
        await this.call('task/remove', { sessionId })
        this.showToast('已移出待办')
      }

      async setCompleted(sessionId, completed) {
        await this.call('task/complete', { sessionId, completed })
      }

      async saveNote(sessionId, note) {
        await this.call('task/note', { sessionId, note })
        this.showToast('备注已保存')
      }

      async setAlias(sessionId, alias) {
        await this.call('task/alias', { sessionId, alias })
        this.showToast('别名已保存')
      }

      async renameSession(sessionId, title) {
        const sessions = this.ctx.sessions
        if (!sessions?.using) throw new Error('会话重命名组件尚未就绪')
        const abort = new AbortController()
        const timer = window.setTimeout(() => abort.abort(), 10000)
        try {
          const result = await sessions.using(sessionId, { source: 'session-todo-rename', signal: abort.signal }, reference => reference.binding.session.rename(title))
          if (!result?.ok) throw new Error(result?.error?.message || 'DSH 标题修改失败')
          return result.value?.title || title
        } finally { window.clearTimeout(timer) }
      }

      async renameTask(sessionId, title) {
        const accepted = await this.renameSession(sessionId, title)
        await this.call('task/title', { sessionId, title: accepted })
      }

      async moveTask(sessionId, groupId) {
        await this.call('task/move', { sessionId, groupId })
        this.showToast('已移动分组')
      }

      async markRead(sessionId, version) {
        const value = await this.call('task/mark-read', {
          sessionId,
          ...(typeof version === 'number' ? { version } : {}),
        })
        return value
      }

      async markAllRead() {
        await this.call('mark-all-read')
        this.showToast('全部结果已标为已读')
      }

      async createGroup(name, color) {
        await this.call('group/create', { name, color })
        this.showToast('分组已创建')
      }

      async updateGroup(groupId, patch) {
        await this.call('group/update', { groupId, ...patch })
        this.showToast('分组已更新')
      }

      async deleteGroup(groupId) {
        const value = await this.call('group/delete', { groupId })
        const removed = value?.outcome?.removed || 0
        this.showToast(removed > 0 ? `分组已删除，已移除 ${removed} 个待办` : '分组已删除')
      }

      async reorderGroup(groupId, direction) {
        await this.call('group/reorder', { groupId, direction })
      }

      async reorderBefore(groupId, beforeId) {
        await this.call('group/reorder', beforeId ? { groupId, beforeId } : { groupId, direction: 'end' })
      }

      async viewSession(sessionId) {
        this.navigationAbort?.abort()
        this.navigationAbort = new AbortController()
        try { await this.navigateSession(sessionId, this.navigationAbort.signal) }
        catch (error) { if (error.name !== 'AbortError') this.showToast(error.message || '打开会话失败', 'error') }
      }

      async navigateSession(sessionId, signal) {
        const sessions = this.ctx.sessions
        const current = this.ctx.uiSession?.adapter?.current
        if (!sessions?.retain || !current?.subscribe || !current?.getSnapshot) throw new Error('会话导航组件尚未就绪，请刷新 DSH 后重试')
        const list = sessions.list.getSnapshot()
        if (list.phase === 'ready' && !list.byId?.[sessionId]) throw new Error('目标会话已不存在')
        if (this.ctx.get?.('workspaces')?.list?.getSnapshot?.().archivedSessionIds?.includes(sessionId)) throw new Error('目标会话已归档，请先恢复会话')
        signal.throwIfAborted()
        const reference = sessions.retain(sessionId, { source: 'session-todo-navigation', signal })
        try {
          await new Promise((resolve, reject) => {
            let done = false, ready = false, unsubscribe = () => {}, timer
            const finish = (error) => {
              if (done) return
              done = true
              window.clearTimeout(timer)
              unsubscribe()
              signal.removeEventListener('abort', onAbort)
              error ? reject(error) : resolve()
            }
            const onAbort = () => finish(new DOMException('Navigation superseded', 'AbortError'))
            const check = () => { if (!done && ready && current.getSnapshot()?.key === sessionId) finish() }
            try {
              unsubscribe = current.subscribe(check)
              timer = window.setTimeout(() => finish(new Error('打开会话超时，请重试')), 10000)
              signal.addEventListener('abort', onAbort, { once: true })
              this.ctx.uiWorkspace.openSession(sessionId)
              Promise.resolve(reference.ready).then(() => { ready = true; check() }, finish)
            } catch (error) { finish(error) }
          })
          signal.throwIfAborted()
          try { window.focus() } catch { /* focus is best-effort */ }
        } finally { reference.release() }
      }

      openFloating() {
        if (this.disposed) return
        if (this.pipWindow && !this.pipWindow.closed) {
          this.pipWindow.focus()
          return
        }
        if (this.nativeHelperAvailable) {
          this.call('window/open')
            .then((value) => {
              if (value?.opened) {
                this.publish({ pipWindow: null, fallbackOpen: false, capability: 'native-helper', capabilityError: '' })
                this.showToast('桌面浮窗已打开，可切换到其他应用')
                return
              }
              this.openFallbackPanel(value?.reason || '桌面窗口未能启动，已显示页面内面板。')
            })
            .catch((error) => this.openFallbackPanel(error?.message || '桌面窗口未能启动，已显示页面内面板。'))
          return
        }
        if (!this.pipAvailable()) {
          this.openFallbackPanel('当前环境没有可用的独立桌面窗口；已显示页面内面板。')
          return
        }
        this.openPip()
      }

      openPip() {
        let request
        try {
          request = window.documentPictureInPicture.requestWindow({ width: 400, height: 620 })
        } catch (error) {
          this.openFallbackPanel(`桌面窗口打开失败：${error?.message || String(error)}`)
          return
        }
        request.then((win) => {
          if (this.disposed) {
            try { win.close() } catch { /* closing an owned window is best-effort */ }
            return
          }
          try {
            this.setupPip(win)
            const onPageHide = () => {
              if (this.pipTimer) {
                try { win.clearInterval(this.pipTimer) } catch { /* window is going away */ }
                this.pipTimer = null
              }
              if (this.pipWindow === win) {
                this.publish({
                  pipWindow: null,
                  capability: this.pipAvailable() ? 'available' : 'unsupported',
                  capabilityError: '',
                })
              }
            }
            win.addEventListener('pagehide', onPageHide, { once: true })
            this.pipTimer = win.setInterval(() => {
              if (this.ctx.connection.state.getSnapshot() === 'connected') {
                void this.load({ quiet: true })
              }
            }, 2500)
            this.publish({ pipWindow: win, fallbackOpen: false, capability: 'document-pip', capabilityError: '' })
            win.focus()
          } catch (error) {
            try { win.close() } catch { /* best-effort */ }
            this.openFallbackPanel(`桌面浮窗初始化失败：${error?.message || String(error)}`)
          }
        }).catch((error) => {
          this.openFallbackPanel(`桌面窗口打开失败：${error?.message || String(error)}`)
        })
      }

      openFallbackPanel(reason) {
        this.publish({
          pipWindow: null,
          fallbackOpen: true,
          capability: this.nativeHelperAvailable || this.pipAvailable() ? 'failed' : 'unsupported',
          capabilityError: reason,
        })
      }

      setupPip(win) {
        const doc = win.document
        doc.documentElement.lang = 'zh-CN'
        doc.title = 'DSH 会话待办'
        const source = getComputedStyle(document.body)
        const rootStyle = doc.documentElement.style
        for (let index = 0; index < source.length; index += 1) {
          const name = source[index]
          if (!name.startsWith('--dsw-') && !name.startsWith('--dsh-')) continue
          const value = source.getPropertyValue(name)
          if (value) rootStyle.setProperty(name, value)
        }
        const scheme = getComputedStyle(document.documentElement).colorScheme
        if (scheme) rootStyle.colorScheme = scheme
        const style = doc.createElement('style')
        style.dataset.dshSessionTodo = 'true'
        style.textContent = CSS
        doc.head.appendChild(style)
        doc.body.className = 'dst-pip-body'
        doc.body.style.margin = '0'
        doc.body.style.overflow = 'hidden'
        doc.body.style.background = 'var(--dsw-alias-bg-base, #17191d)'
        doc.body.style.fontFamily = source.fontFamily
        doc.body.style.fontSize = source.fontSize || '13px'
      }

      closeFloating(options = {}) {
        const win = this.pipWindow
        if (this.pipTimer && win) {
          try { win.clearInterval(this.pipTimer) } catch { /* window is going away */ }
        }
        this.pipTimer = null
        this.publish({
          pipWindow: null,
          fallbackOpen: false,
          capability: this.snapshot.capability === 'native-helper'
            ? 'native-helper'
            : (this.pipAvailable() ? 'available' : 'unsupported'),
          ...(options.silent ? {} : { capabilityError: '' }),
        })
        if (win && !win.closed) {
          try { win.close() } catch { /* owned window close is best-effort */ }
        }
      }

      showToast(message, tone) {
        if (this.toastTimer) window.clearTimeout(this.toastTimer)
        this.publish({ toast: { message, tone: tone || 'default' } })
        this.toastTimer = window.setTimeout(() => {
          this.publish({ toast: null })
          this.toastTimer = null
        }, 2600)
      }

      relativeNow() {
        return Date.now()
      }
    }

    function useController() {
      return useSyncExternalStore(
        controller.subscribe,
        controller.getSnapshot,
        controller.getSnapshot,
      )
    }

    function Icon({ name, size = 16, className }) {
      const common = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        className,
      }
      switch (name) {
        case 'todo':
          return h('svg', common,
            h('rect', { key: 'r', x: 3.5, y: 3.5, width: 17, height: 17, rx: 4 }),
            h('path', { key: 'p', d: TODO_ICON }))
        case 'plus':
          return h('svg', common, h('path', { d: 'M12 5v14M5 12h14' }))
        case 'close':
          return h('svg', common, h('path', { d: 'm6 6 12 12M18 6 6 18' }))
        case 'refresh':
          return h('svg', common, h('path', { d: 'M20 6v5h-5M4 18v-5h5M18.5 11a7 7 0 0 0-12-3M5.5 13a7 7 0 0 0 12 3' }))
        case 'more':
          return h('svg', common, h('circle', { cx: 5, cy: 12, r: 1.4, fill: 'currentColor', stroke: 'none' }), h('circle', { cx: 12, cy: 12, r: 1.4, fill: 'currentColor', stroke: 'none' }), h('circle', { cx: 19, cy: 12, r: 1.4, fill: 'currentColor', stroke: 'none' }))
        case 'chevron':
          return h('svg', common, h('path', { d: 'm9 6 6 6-6 6' }))
        case 'check':
          return h('svg', common, h('path', { d: 'm5 12 4.2 4.2L19 6.5' }))
        case 'alert':
          return h('svg', common, h('path', { d: 'M12 8v5M12 17h.01' }), h('path', { d: 'M10.3 4.2 2.8 17.5A1.8 1.8 0 0 0 4.4 20h15.2a1.8 1.8 0 0 0 1.6-2.5L13.7 4.2a2 2 0 0 0-3.4 0z' }))
        case 'clock':
          return h('svg', common, h('circle', { cx: 12, cy: 12, r: 8.5 }), h('path', { d: 'M12 7.5V12l3 2' }))
        case 'pin':
          return h('svg', common, h('path', { d: 'M9 3h6l-1 6 3 3H7l3-3-1-6zM12 12v7' }))
        case 'note':
          return h('svg', common, h('path', { d: 'M5 4h14v12l-4 4H5V4z' }), h('path', { d: 'M15 20v-4h4M8 8h8M8 12h6' }))
        case 'trash':
          return h('svg', common, h('path', { d: 'M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5' }))
        case 'up':
          return h('svg', common, h('path', { d: 'm6 14 6-6 6 6' }))
        case 'down':
          return h('svg', common, h('path', { d: 'm6 10 6 6 6-6' }))
        case 'external':
          return h('svg', common, h('path', { d: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5' }))
        case 'search':
          return h('svg', common, h('circle', { cx: 11, cy: 11, r: 6.5 }), h('path', { d: 'm16 16 5 5' }))
        case 'folder':
          return h('svg', common, h('path', { d: 'M3.5 6.5h6l2 2h9v10h-17v-12z' }))
        default:
          return h('svg', common, h('circle', { cx: 12, cy: 12, r: 8 }))
      }
    }

    function FooterAction({ wide }) {
      const state = useController()
      const count = countUnread(state.data)
      return h('button', {
        type: 'button',
        className: `dst-footer-action${wide ? ' is-wide' : ''}`,
        title: '打开会话待办浮窗',
        'aria-label': `会话待办${count > 0 ? `，${count} 条待查看` : ''}`,
        onClick: () => controller.openFloating(),
      },
      h(Icon, { name: 'todo', size: 17 }),
      wide ? h('span', { className: 'dst-footer-label' }, '会话待办') : h('span', { className: 'dst-sr-only' }, '会话待办'),
      count > 0 ? h('span', { className: 'dst-footer-badge' }, count > 99 ? '99+' : String(count)) : null)
    }

    function AddGroupPicker({ sessionId, title, groups, onDone, side = false, menuItem = false }) {
      const [open, setOpen] = useState(false)
      const state = useController()
      const task = state.data?.tasks?.[sessionId]
      const choose = async groupId => {
        try {
          if (task) await controller.moveTask(sessionId, groupId)
          else await controller.addTask(sessionId, title, groupId)
          setOpen(false); onDone?.()
        } catch (error) { controller.showToast(error.message, 'error') }
      }
      const icon = h(IconChecklistOutlineRegular, { size: 16 })
      const label = task ? '待办分组' : '加入待办'
      const trigger = menuItem
        ? h(HostMenuItemButton, { icon, onSelect: () => setOpen(!open) }, h('span', { className: 'dst-group-picker-label' }, label, h('svg', { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': true }, h('path', { d: 'M5 3 9 7 5 11', stroke: 'currentColor', strokeWidth: 1 }))))
        : h('button', { type: 'button', className: 'dst-header-add', 'aria-haspopup': 'menu', 'aria-expanded': open, onClick: () => setOpen(!open) }, icon, label)
      return h(HostMenu, { open, anchor: trigger, items: groups.map(group => ({ id: group.id, label: group.name, icon: h('span', { className: 'dst-group-color-dot', style: { background: group.color } }) })), selectedId: task?.groupId,
        onSelect: id => void choose(id), onClose: () => setOpen(false), side: side ? 'right' : 'bottom', portal: false, className: menuItem ? 'dst-native-topic-picker' : 'dst-native-group-picker' })
    }

    function HeaderAction({ sessionId, useSessions }) {
      const state = useController()
      const session = useSessions(snapshot => snapshot?.byId?.[sessionId])
      return h(AddGroupPicker, { sessionId, title: session?.displayTitle || sessionId, groups: state.data?.groups || [] })
    }

    function TopicTodoMenu({ sessionId, displayTitle, useMenuOpenState }) {
      const state = useController()
      const [, setMenuOpen] = useMenuOpenState()
      return h(AddGroupPicker, { sessionId, title: displayTitle || sessionId, groups: state.data?.groups || [], onDone: () => setMenuOpen(false), side: true, menuItem: true })
    }

    function TopicContextMenu({ sessionId }) {
      const ref = useRef(null)
      useEffect(() => {
        const row = ref.current?.closest('[data-row-key]')
        if (row?.getAttribute('data-row-key') !== `session:${sessionId}`) return
        const open = event => {
          if (event.defaultPrevented || event.target.closest('input,textarea,[contenteditable="true"]')) return
          // The shipped DSH row places its own menu trigger before its action
          // slots. Reuse that trigger so selection and all host actions survive.
          const trigger = row.querySelector('button')
          if (!trigger) return
          event.preventDefault(); event.stopPropagation()
          if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
        }
        row.addEventListener('contextmenu', open)
        return () => row.removeEventListener('contextmenu', open)
      }, [sessionId])
      return h('span', { ref, hidden: true })
    }

    function GroupTabs({ groups, tasks, selected, onSelect, onEdit, onCreate }) {
      const rail = useRef(null)
      const [menu, setMenu] = useState(null)
      const counts = Object.fromEntries(groups.map(group => [group.id, 0]))
      for (const task of Object.values(tasks || {})) if (!task.completed) {
        const id = Object.hasOwn(counts, task.groupId) ? task.groupId : 'default'
        counts[id] = (counts[id] || 0) + 1
      }
      useEffect(() => {
        if (!menu) return
        const owner = rail.current?.ownerDocument
        const close = event => { if (!event.target.closest('.dst-group-context')) setMenu(null) }
        owner?.addEventListener('pointerdown', close)
        return () => owner?.removeEventListener('pointerdown', close)
      }, [menu])
      const move = async (event, group, index) => {
        event.preventDefault()
        const sessionId = event.dataTransfer.getData('application/x-dsh-todo-task')
        const from = event.dataTransfer.getData('application/x-dsh-todo-group')
        try {
          if (sessionId) { await controller.moveTask(sessionId, group.id) }
          else if (from && from !== group.id) {
            const bounds = event.currentTarget.getBoundingClientRect()
            const beforeId = event.clientX > bounds.left + bounds.width / 2 ? groups[index + 1]?.id : group.id
            if (beforeId !== from) await controller.reorderBefore(from, beforeId)
          }
        } catch (error) { controller.showToast(error.message, 'error') }
      }
      return h('div', { className: 'dst-group-strip' },
        h('button', { type: 'button', className: 'dst-icon-button', 'aria-label': '向左滚动分组', onClick: () => rail.current?.scrollBy({ left: -140, behavior: 'smooth' }) }, '‹'),
        h('div', { className: 'dst-group-rail', ref: rail, role: 'tablist', 'aria-label': '待办分组', onWheel: event => { if (rail.current && Math.abs(event.deltaY) > Math.abs(event.deltaX)) rail.current.scrollLeft += event.deltaY } },
          groups.map((group, index) => h(GroupTag, { key: group.id, group, count: counts[group.id] || 0, selected: selected === group.id, onSelect: () => onSelect(group.id), onContextMenu: event => { event.preventDefault(); setMenu(group) }, onDrop: event => void move(event, group, index), rail }))),
        h('button', { type: 'button', className: 'dst-icon-button', 'aria-label': '向右滚动分组', onClick: () => rail.current?.scrollBy({ left: 140, behavior: 'smooth' }) }, '›'),
        h('button', { type: 'button', className: 'dst-icon-button', 'aria-label': '新建分组', onClick: onCreate }, '+'),
        menu ? h('div', { className: 'dst-group-context', onKeyDown: event => { if (event.key === 'Escape') setMenu(null) } },
          h('button', { type: 'button', onClick: () => { onEdit(menu); setMenu(null) } }, '重命名'),
          menu.id !== 'default' ? h('button', { type: 'button', onClick: () => void controller.deleteGroup(menu.id).then(() => setMenu(null)).catch(error => controller.showToast(error.message, 'error')) }, '删除分组及组内待办') : null,
          null) : null)
    }

    function GroupTag({ group, count, selected, onSelect, onContextMenu, onDrop, rail }) {
      const [editing, setEditing] = useState(false), [draft, setDraft] = useState(group.name), [saving, setSaving] = useState(false)
      const pending = useRef(false), cancelled = useRef(false)
      const save = async () => {
        if (pending.current || cancelled.current) return
        const name = draft.trim()
        if (!name) { controller.showToast('分组名称不能为空', 'error'); return }
        if (name === group.name) { setEditing(false); return }
        pending.current = true; setSaving(true)
        try { await controller.updateGroup(group.id, { name }); setEditing(false) }
        catch (error) { controller.showToast(error.message, 'error') }
        finally { pending.current = false; setSaving(false) }
      }
      if (editing) return h('input', { className: 'dst-group-name-input', style: { borderColor: group.color }, value: draft, autoFocus: true, maxLength: 40, readOnly: saving, 'aria-label': '重命名待办分组', onChange: event => setDraft(event.target.value), onFocus: event => event.target.select(), onBlur: () => void save(),
        onKeyDown: event => { if (event.key === 'Enter') { event.preventDefault(); void save() } if (event.key === 'Escape' && !saving) { cancelled.current = true; setEditing(false) } } })
      return h('button', { type: 'button', role: 'tab', className: `dst-group-tag${selected ? ' is-active' : ''}`, style: { '--dst-tag-color': group.color }, 'aria-selected': selected, 'aria-label': `${group.name}，${count} 个未完成待办`, draggable: true, title: group.name, onClick: onSelect, onContextMenu,
        onDoubleClick: event => { event.preventDefault(); cancelled.current = false; setDraft(group.name); setEditing(true) },
        onDragStart: event => { event.dataTransfer.setData('application/x-dsh-todo-group', group.id); event.dataTransfer.effectAllowed = 'move' },
        onDragOver: event => { if ([...event.dataTransfer.types].some(type => type.startsWith('application/x-dsh-todo-'))) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; const rect = rail.current.getBoundingClientRect(); if (event.clientX < rect.left + 25) rail.current.scrollLeft -= 15; if (event.clientX > rect.right - 25) rail.current.scrollLeft += 15 } }, onDrop },
        h('span', { className: 'dst-group-color-dot', style: { background: group.color } }), group.name, h('span', { className: 'dst-tag-count' }, String(count)))
    }

    function SessionTitle({ sessionId, title, onView }) {
      const [editing, setEditing] = useState(false)
      const [draft, setDraft] = useState(title)
      const [saving, setSaving] = useState(false)
      const click = useRef(null), pending = useRef(false), cancelled = useRef(false)
      useEffect(() => () => window.clearTimeout(click.current), [])
      const save = async () => {
        if (cancelled.current || pending.current) return
        const next = draft.trim()
        if (!next) { controller.showToast('标题不能为空', 'error'); return }
        if (next === title) { setEditing(false); return }
        pending.current = true; setSaving(true)
        try { await controller.renameTask(sessionId, next); setEditing(false) }
        catch (error) { controller.showToast(error.message, 'error') }
        finally { pending.current = false; setSaving(false) }
      }
      return editing ? h('input', { className: 'dst-title-input', value: draft, maxLength: 300, autoFocus: true, readOnly: saving, 'aria-label': '重命名会话标题',
        onFocus: event => event.target.select(), onChange: event => setDraft(event.target.value), onBlur: () => void save(),
        onKeyDown: event => { if (event.key === 'Enter') { event.preventDefault(); void save() } if (event.key === 'Escape' && !saving) { cancelled.current = true; setEditing(false) } } })
        : h('button', { type: 'button', className: 'dst-title-button', title: '打开会话', onClick: event => { window.clearTimeout(click.current); if (event.detail === 0) onView(); else click.current = window.setTimeout(onView, 500) },
          onDoubleClick: event => { event.preventDefault(); window.clearTimeout(click.current); cancelled.current = false; setDraft(title); setEditing(true) } }, title)
    }

    function FloatingHost({ useSessions, useWorkspaces, useSessionStatus }) {
      const state = useController()
      const list = useSessions((snapshot) => snapshot)
      const workspaces = useWorkspaces((snapshot) => snapshot)
      const statuses = useSessionStatus((snapshot) => snapshot)
      const [fallbackPosition, setFallbackPosition] = useState(() => ({
        x: Math.max(8, window.innerWidth - 424),
        y: Math.max(8, window.innerHeight - 636),
      }))
      const dragRef = useRef(null)
      useEffect(() => {
        if (list?.phase !== 'ready' || state.connectionState !== 'connected') return
        const archived = new Set(workspaces?.archivedSessionIds || [])
        const ids = new Set([...Object.keys(list.byId || {}), ...[...(statuses?.keys?.() || [])]])
        const sessions = [...ids].sort().map(sessionId => ({ sessionId, title: list.byId?.[sessionId]?.displayTitle || '', running: Boolean(statuses?.get?.(sessionId)?.running || list.byId?.[sessionId]?.running), pendingKind: visiblePendingKind(statuses?.get?.(sessionId)?.pendingInteraction?.kind), archived: archived.has(sessionId) }))
        let stopped = false, timer
        const push = () => controller.call('client/sessions', { sessions }).catch(() => { if (!stopped) timer = window.setTimeout(push, 2500) })
        void push()
        return () => { stopped = true; window.clearTimeout(timer) }
      }, [list, statuses, workspaces, state.connectionState])


      useEffect(() => {
        const move = (event) => {
          const drag = dragRef.current
          if (!drag) return
          const maxX = Math.max(8, window.innerWidth - 408)
          const maxY = Math.max(8, window.innerHeight - 628)
          setFallbackPosition({
            x: Math.min(Math.max(8, event.clientX - drag.dx), maxX),
            y: Math.min(Math.max(8, event.clientY - drag.dy), maxY),
          })
        }
        const up = () => { dragRef.current = null }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        window.addEventListener('pointercancel', up)
        return () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          window.removeEventListener('pointercancel', up)
        }
      }, [])

      const startDrag = (event) => {
        if (event.button !== 0 || event.target?.closest?.('button')) return
        dragRef.current = {
          dx: event.clientX - fallbackPosition.x,
          dy: event.clientY - fallbackPosition.y,
        }
      }

      useEffect(() => {
        if (!statuses) return undefined
        const timer = window.setTimeout(() => {
          void controller.load({ quiet: true })
        }, 320)
        return () => window.clearTimeout(timer)
      }, [statuses])

      if (!state.pipWindow && !state.fallbackOpen) return null
      const panel = h(TodoPanel, {
        mode: state.pipWindow ? 'pip' : 'fallback',
        state,
        list,
        workspaces,
        statuses,
        onDragStart: startDrag,
      })
      if (state.pipWindow && !state.pipWindow.closed) {
        return createPortal(panel, state.pipWindow.document.body)
      }
      return h('div', {
        className: 'dst-floating-layer',
        style: { left: `${fallbackPosition.x}px`, top: `${fallbackPosition.y}px` },
      }, panel)
    }

    function TodoPanel({ mode, state, list, workspaces, statuses, onDragStart }) {
      const data = state.data
      const [tab, setTab] = useState('todo')
      const [selectedGroup, setSelectedGroup] = useState('default')
      const [query, setQuery] = useState('')
      const [dialog, setDialog] = useState(null)
      const [noteSessionId, setNoteSessionId] = useState(null)
      const [completedOpen, setCompletedOpen] = useState(false)
      const model = useMemo(
        () => buildModel(data, list, workspaces, statuses, 'all', query),
        [data, list, workspaces, statuses, query],
      )
      useEffect(() => { if (data?.groups?.length && !data.groups.some(g => g.id === selectedGroup)) setSelectedGroup('default') }, [data?.groups, selectedGroup])
      const noteTask = noteSessionId ? data?.tasks?.[noteSessionId] : null
      const panelClass = `dst-panel dst-panel--${mode === 'pip' ? 'pip' : 'fallback'}`

      return h('section', { className: panelClass, 'aria-label': '会话待办' },
        h('header', {
          className: `dst-header${mode === 'fallback' ? ' dst-header--draggable' : ''}`,
          onPointerDown: mode === 'fallback' ? onDragStart : undefined,
        },
          h('div', { className: 'dst-title-wrap' },
            h('h1', { className: 'dst-title' }, h(Icon, { name: 'todo', size: 17 }), '会话待办'),
            null),
          h('div', { className: 'dst-header-actions' },
            h('button', { type: 'button', className: 'dst-icon-button', title: '刷新', 'aria-label': '刷新会话待办', onClick: () => void controller.load() }, h(Icon, { name: 'refresh', size: 15 })),
            h('button', { type: 'button', className: 'dst-icon-button', title: '关闭', 'aria-label': '关闭会话待办', onClick: () => controller.closeFloating() }, h(Icon, { name: 'close', size: 16 })))),
        state.connectionState && state.connectionState !== 'connected'
          ? h('div', { className: `dst-banner dst-banner--${state.connectionState === 'connecting' ? 'warn' : 'error'}` },
            h('span', null, state.connectionState === 'connecting' ? '正在连接后台…' : '与后台连接已断开，正在重连…'))
          : null,
        state.capability === 'unsupported' || state.capability === 'failed'
          ? h('div', { className: 'dst-banner dst-banner--warn' },
            h('span', null, state.capability === 'unsupported' ? '当前环境无法打开独立桌面窗口，已显示页面内面板。' : (state.capabilityError || '桌面窗口打开失败。')),
            controller.nativeHelperAvailable || controller.pipAvailable()
              ? h('button', { type: 'button', className: 'dst-button', onClick: () => controller.openFloating() }, '重试桌面浮窗')
              : null)
          : null,
        state.error
          ? h('div', { className: 'dst-banner dst-banner--error' },
            h('span', null, `读取失败：${state.error}`),
            h('button', { type: 'button', className: 'dst-button', onClick: () => void controller.load() }, '重试'))
          : null,
        h('div', { className: 'dst-toolbar' },
          h('input', {
            className: 'dst-search',
            type: 'search',
            value: query,
            placeholder: '搜索标题、备注…',
            'aria-label': '搜索会话待办',
            onChange: (event) => setQuery(event.target.value),
          }),
          query ? h('button', { type: 'button', className: 'dst-icon-button', title: '清除搜索', 'aria-label': '清除搜索', onClick: () => setQuery('') }, h(Icon, { name: 'close', size: 14 })) : null),
        h('div', { className: 'dst-tabs', role: 'tablist', 'aria-label': '会话待办视图' },
          h('button', {
            type: 'button',
            role: 'tab',
            'aria-selected': tab === 'unread',
            className: `dst-tab${tab === 'unread' ? ' is-active' : ''}`,
            onClick: () => setTab('unread'),
          }, '待查看 ', h('span', { className: 'dst-count' }, String(model.unread.length))),
          h('button', {
            type: 'button',
            role: 'tab',
            'aria-selected': tab === 'todo',
            className: `dst-tab${tab === 'todo' ? ' is-active' : ''}`,
            onClick: () => setTab('todo'),
          }, '待办 ', h('span', { className: 'dst-count' }, String(model.activeCount))),
          h('div', { className: 'dst-tab-extra' },
            tab === 'unread' && model.unread.length > 0
              ? h('button', { type: 'button', className: 'dst-link', onClick: () => void controller.markAllRead().catch((error) => controller.showToast(error.message, 'error')) }, '全部已读')
              : null)),
        tab === 'todo' ? h(GroupTabs, { groups: data?.groups || [], tasks: data?.tasks, selected: selectedGroup, onSelect: setSelectedGroup, onEdit: group => setDialog({ type: 'group', mode: 'edit', group }), onCreate: () => setDialog({ type: 'group', mode: 'create' }) }) : null,
        h('div', { className: 'dst-content' },
          !data && state.loading
            ? h('div', { className: 'dst-empty' }, h(Icon, { name: 'clock', size: 24 }), h('div', { className: 'dst-empty-title' }, '正在连接…'))
            : tab === 'unread'
              ? renderUnread(model, state, list, statuses, setNoteSessionId)
              : renderTodos(model, state, list, statuses, completedOpen, setCompletedOpen, setNoteSessionId, setDialog, selectedGroup),
          null),
        dialog?.type === 'group'
          ? h(GroupDialog, {
            mode: dialog.mode,
            group: dialog.group,
            defaultColor: ['#8BBFA8', '#D6A451', '#A995DD', '#7DA6E8', '#CF9698', '#989FA9'].find(color => !data?.groups?.some(group => group.color.toLowerCase() === color.toLowerCase())) || '#8BBFA8',
            onClose: () => setDialog(null),
            onSave: async (name, color) => {
              if (dialog.mode === 'create') await controller.createGroup(name, color)
              else await controller.updateGroup(dialog.group.id, { name, color })
              setDialog(null)
            },
          })
          : null,
        dialog?.type === 'alias' && dialog.task
          ? h(AliasDialog, {
            task: dialog.task,
            originalTitle: resolveTitle(list, dialog.task.sessionId, dialog.task),
            onClose: () => setDialog(null),
            onSave: async (alias) => {
              await controller.setAlias(dialog.task.sessionId, alias)
              setDialog(null)
            },
          })
          : null,
        dialog?.type === 'confirm'
          ? h(ConfirmDialog, {
            title: dialog.title,
            message: dialog.message,
            confirmLabel: dialog.confirmLabel || '确认',
            danger: dialog.danger,
            onClose: () => setDialog(null),
            onConfirm: async () => {
              await dialog.onConfirm()
              setDialog(null)
            },
          })
          : null,
        noteTask
          ? h(NoteEditor, {
            key: noteSessionId,
            task: noteTask,
            onClose: () => setNoteSessionId(null),
            onSave: (note) => controller.saveNote(noteSessionId, note),
          })
          : null,
        state.toast
          ? h('div', { className: `dst-toast${state.toast.tone === 'error' ? ' dst-toast--error' : ''}`, role: 'status' }, state.toast.message)
          : null)
    }

    function renderUnread(model, state, list, statuses, setNoteSessionId) {
      if (model.unread.length === 0) {
        return h('div', { className: 'dst-empty' },
          h(Icon, { name: 'check', size: 30 }),
          h('div', { className: 'dst-empty-title' }, '暂无待查看内容'),
          null)
      }
      return h(React.Fragment, null,
        model.unread.map((row) => h(UnreadCard, {
          key: row.sessionId,
          row,
          onView: () => void controller.viewSession(row.sessionId),
          onMarkRead: () => void controller.markRead(row.sessionId, row.result?.version).catch((error) => controller.showToast(error.message, 'error')),
          groups: state.data?.groups || [],
          onNote: row.task ? () => setNoteSessionId(row.sessionId) : null,
        })))
    }

    function renderTodos(model, state, list, statuses, completedOpen, setCompletedOpen, setNoteSessionId, setDialog, selectedGroup) {
      const group = model.groups.find(item => item.id === selectedGroup) || model.groups.find(item => item.id === 'default')
      const completed = model.completed.filter(row => row.group.id === (group?.id || selectedGroup))
      const rows = group?.tasks || []
      const renderRow = (row, done) => h(TaskCard, {
        key: row.sessionId, ...row, task: row.task, group: row.group, list, completed: done,
        onView: () => void controller.viewSession(row.sessionId),
        onToggle: () => void controller.setCompleted(row.sessionId, !done).catch(error => controller.showToast(error.message, 'error')),
        onNote: () => setNoteSessionId(row.sessionId),
        onMove: groupId => void controller.moveTask(row.sessionId, groupId).catch(error => controller.showToast(error.message, 'error')),
        onRemove: () => void controller.removeTask(row.sessionId).catch(error => controller.showToast(error.message, 'error')),
        groups: model.rawGroups,
        onMarkRead: () => void controller.markRead(row.sessionId).catch(error => controller.showToast(error.message, 'error')),
      })
      return h(React.Fragment, null,
        rows.length ? rows.map(row => renderRow(row, false)) : h('div', { className: 'dst-empty' }, '该分组暂无待办'),
        completed.length ? h('section', null,
          h('button', { type: 'button', className: 'dst-link', onClick: () => setCompletedOpen(!completedOpen) }, `${completedOpen ? '⌄' : '›'} 已完成 ${completed.length}`),
          completedOpen ? completed.map(row => renderRow(row, true)) : null) : null)
    }

    function GroupHeader({ group, count, canUp, canDown, onRename, onColor, onUp, onDown, onDelete, system }) {
      const [open, setOpen] = useState(false)
      return h('div', { className: 'dst-group' },
        h('div', { className: 'dst-group-head', style: { '--dst-group': group.color } },
          h('span', { className: 'dst-group-dot' }),
          h('span', { className: 'dst-group-name', title: group.name }, group.name),
          h('span', { className: 'dst-group-count' }, `${count}`),
          system
            ? null
            : h('button', {
              type: 'button',
              className: 'dst-group-menu-button',
              title: '分组操作',
              'aria-label': `分组操作：${group.name}`,
              'aria-expanded': open,
              onClick: () => setOpen(!open),
            }, h(Icon, { name: 'more', size: 13 }))),
        open
          ? h('div', { className: 'dst-group-tools' },
            h('button', { type: 'button', className: 'dst-button', onClick: () => { setOpen(false); onRename() } }, '重命名'),
            h('input', {
              type: 'color',
              className: 'dst-color',
              value: group.color,
              title: '分组颜色',
              'aria-label': `更改 ${group.name} 的颜色`,
              onChange: (event) => onColor(event.target.value),
            }),
            h('button', { type: 'button', className: 'dst-button', disabled: !canUp, onClick: onUp }, h(Icon, { name: 'up', size: 11 }), '上移'),
            h('button', { type: 'button', className: 'dst-button', disabled: !canDown, onClick: onDown }, h(Icon, { name: 'down', size: 11 }), '下移'),
            h('button', { type: 'button', className: 'dst-button dst-button--danger', onClick: () => { setOpen(false); onDelete() } }, h(Icon, { name: 'trash', size: 11 }), '删除'))
          : null)
    }

    function TaskCard({ task, group, list, workspaceTitle, unavailable, running, pendingKind, completed, onView, onToggle, onNote, onAlias, onMove, onRemove, groups, onMarkRead }) {
      const [menuOpen, setMenuOpen] = useState(false)
      const title = resolveTitle(list, task.sessionId, task)
      const original = task.alias ? resolveOriginalTitle(list, task.sessionId, task) : ''
      const result = controller.getSnapshot().data?.results?.[task.sessionId]
      const read = controller.getSnapshot().data?.read?.[task.sessionId] ?? 0
      const unread = Boolean(result && result.version > read)
      const isSubagent = Boolean(result?.sourceSessionId && result.sourceSessionId !== task.sessionId)
      const status = taskStatus(result?.kind, running, unread, pendingKind, isSubagent, completed)
      return h('article', { className: `dst-card${completed ? ' is-completed' : ''}${unread ? ' is-unread' : ''}`, style: { '--dst-group': group.color }, onContextMenu: event => { if (event.target.closest('input,textarea')) return; event.preventDefault(); setMenuOpen(true) }, draggable: true, onDragStart: event => { if (event.target.closest('input,textarea')) { event.preventDefault(); return } event.dataTransfer.setData('application/x-dsh-todo-task', task.sessionId); event.dataTransfer.effectAllowed = 'move' } },
        h('div', { className: 'dst-card-top' },
          h('button', {
            type: 'button',
            className: `dst-check${completed ? ' is-checked' : ''}`,
            role: 'checkbox',
            'aria-checked': completed,
            title: completed ? '恢复待办' : '完成待办',
            'aria-label': completed ? '恢复待办' : '完成待办',
            onClick: onToggle,
          }, completed ? h(Icon, { name: 'check', size: 12 }) : null),
          h('div', { className: 'dst-card-head' },
            h(SessionTitle, { sessionId: task.sessionId, title, onView }),
            h('div', { className: 'dst-meta' },
              h('span', { className: 'dst-meta-workspace' }, workspaceTitle || '未分组'),
              unavailable ? h('span', { className: 'dst-meta-sep' }, '·') : null,
              unavailable ? h('span', { className: 'dst-meta-workspace' }, '会话不可用，备注仍保留') : null,
              original ? h('span', { className: 'dst-meta-sep' }, '·') : null,
              original ? h('span', { className: 'dst-meta-workspace', title: original }, `原名 ${original}`) : null)),
          h('span', { className: `dst-status dst-status--${status.tone}` }, status.spinner ? h('span', { className: 'dst-spinner' }) : h('span', { className: 'dst-status-dot' }), status.label),
          h('button', { type: 'button', className: 'dst-icon-button', title: '会话操作', 'aria-label': '会话操作', 'aria-expanded': menuOpen, onClick: () => setMenuOpen(!menuOpen) }, h(Icon, { name: 'more', size: 14 }))),
        task.note
          ? h('button', { type: 'button', className: 'dst-note-preview', title: '编辑个人备注', onClick: onNote }, task.note)
          : null,
        menuOpen
          ? h('div', { className: 'dst-menu' },
            h('div', { className: 'dst-menu-row' },
              h('button', { type: 'button', onClick: () => { setMenuOpen(false); onNote() } }, '编辑备注'),

              h('button', { type: 'button', onClick: () => { setMenuOpen(false); onMarkRead() } }, '标记已读')),
            h('div', { className: 'dst-menu-row' },
              h('label', { htmlFor: `dst-move-${task.sessionId}` }, '移动到'),
              h('select', {
                id: `dst-move-${task.sessionId}`,
                value: task.groupId,
                onChange: (event) => { onMove(event.target.value); setMenuOpen(false) },
              }, groups.map((candidate) => h('option', { key: candidate.id, value: candidate.id }, candidate.name)))),
            h('div', { className: 'dst-menu-row' },
              h('button', { type: 'button', className: 'danger', onClick: () => { setMenuOpen(false); onRemove() } }, '移出待办')))
          : null)
    }

    function UnreadCard({ row, onView, onMarkRead, onAdd, onNote, groups }) {
      const status = unreadStatus(row)
      const [menuOpen, setMenuOpen] = useState(false)
      return h('article', { className: 'dst-card is-unread', onContextMenu: event => { if (event.target.closest('input,textarea')) return; event.preventDefault(); setMenuOpen(true) } },
        h('div', { className: 'dst-card-top' },
          h('div', { className: 'dst-card-head' },
            h(SessionTitle, { sessionId: row.sessionId, title: row.title, onView }),
            h('div', { className: 'dst-meta' },
              h('span', { className: 'dst-meta-workspace' }, row.workspace),
              row.unavailable ? h('span', { className: 'dst-meta-sep' }, '·') : null,
              row.unavailable ? h('span', { className: 'dst-meta-workspace' }, '会话不可用，备注仍保留') : null,
              row.at ? h('span', { className: 'dst-meta-sep' }, '·') : null,
              row.at ? h('span', null, relativeTime(row.at)) : null)),
          h('span', { className: `dst-status dst-status--${status.tone}` }, status.spinner ? h('span', { className: 'dst-spinner' }) : h('span', { className: 'dst-status-dot' }), status.label),
          h('button', { type: 'button', className: 'dst-icon-button', title: '会话操作', 'aria-label': '会话操作', 'aria-expanded': menuOpen, onClick: () => setMenuOpen(!menuOpen) }, h(Icon, { name: 'more', size: 14 }))),
        row.task?.note
          ? h('button', { type: 'button', className: 'dst-note-preview', onClick: onNote }, row.task.note)
          : null,
        menuOpen ? h('div', { className: 'dst-menu', onKeyDown: (event) => { if (event.key === 'Escape') setMenuOpen(false) } },
          h('div', { className: 'dst-menu-row' },
            row.task
              ? h('button', { type: 'button', onClick: () => { setMenuOpen(false); onNote() } }, '编辑备注')
              : h(AddGroupPicker, { sessionId: row.sessionId, title: row.title, groups, onDone: () => setMenuOpen(false) }),
            row.result ? h('button', { type: 'button', onClick: () => { setMenuOpen(false); onMarkRead() } }, '标记已读') : null)) : null)
    }

    function NoteEditor({ task, onClose, onSave }) {
      const [draft, setDraft] = useState(task.note || '')
      const [error, setError] = useState('')
      const [saving, setSaving] = useState(false)
      const max = controller.getSnapshot().data?.maxNoteLength || 2000
      const save = async () => {
        setSaving(true)
        setError('')
        try {
          await onSave(draft)
          onClose()
        } catch (failure) {
          setError(failure?.message || '保存失败')
        } finally {
          setSaving(false)
        }
      }
      return h('div', { className: 'dst-note-editor' },
        h('textarea', {
          value: draft,
          maxLength: max,
          autoFocus: true,
          'aria-label': '个人备注',
          placeholder: '写下只对自己可见的备注…',
          onChange: (event) => setDraft(event.target.value),
          onKeyDown: (event) => {
            if (event.key === 'Escape') { event.stopPropagation(); onClose() }
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); void save() }
          },
        }),
        h('div', { className: 'dst-note-editor-footer' },
          h('span', { className: 'dst-note-count' }, `${draft.length}/${max}`),
          h('button', { type: 'button', className: 'dst-button', onClick: onClose }, '取消'),
          h('button', { type: 'button', className: 'dst-button dst-button--primary', disabled: saving, onClick: () => void save() }, saving ? '保存中…' : '保存')),
        error ? h('div', { className: 'dst-error-text' }, error) : null)
    }

    function GroupDialog({ mode, group, onClose, onSave, defaultColor }) {
      const [name, setName] = useState(group?.name || '')
      const [color, setColor] = useState(group?.color || defaultColor || '#D6A451')
      const [error, setError] = useState('')
      const [saving, setSaving] = useState(false)
      useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])
      const save = async () => {
        setSaving(true)
        setError('')
        try {
          await onSave(name.trim(), color)
        } catch (failure) {
          setError(failure?.message || '保存失败')
        } finally {
          setSaving(false)
        }
      }
      return h('div', { className: 'dst-modal-backdrop', onMouseDown: (event) => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: 'dst-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': mode === 'create' ? '新建分组' : '编辑分组' },
          h('h2', { className: 'dst-modal-title' }, mode === 'create' ? '新建分组' : '编辑分组'),
          h('label', { className: 'dst-modal-field' }, '名称',
            h('input', { className: 'dst-modal-input', value: name, maxLength: 40, autoFocus: true, onChange: (event) => setName(event.target.value), onKeyDown: (event) => { if (event.key === 'Enter') void save() } })),
          h('label', { className: 'dst-modal-field' }, '颜色',
            h('span', { className: 'dst-modal-color-row' },
              h('input', { type: 'color', className: 'dst-color', value: color, 'aria-label': '选择分组颜色', onChange: (event) => setColor(event.target.value) }),
              h('input', { className: 'dst-modal-input', value: color, maxLength: 7, onChange: (event) => setColor(event.target.value) }))),
          error ? h('div', { className: 'dst-error-text' }, error) : null,
          h('div', { className: 'dst-modal-actions' },
            h('button', { type: 'button', className: 'dst-button', onClick: onClose }, '取消'),
            h('button', { type: 'button', className: 'dst-button dst-button--primary', disabled: saving, onClick: () => void save() }, saving ? '保存中…' : '保存'))))
    }

    function AliasDialog({ task, originalTitle, onClose, onSave }) {
      const [alias, setAlias] = useState(task.alias || '')
      const [error, setError] = useState('')
      const [saving, setSaving] = useState(false)
      useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])
      const save = async () => {
        setSaving(true)
        setError('')
        try {
          await onSave(alias.trim())
        } catch (failure) {
          setError(failure?.message || '保存失败')
        } finally {
          setSaving(false)
        }
      }
      return h('div', { className: 'dst-modal-backdrop', onMouseDown: (event) => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: 'dst-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': '设置别名' },
          h('h2', { className: 'dst-modal-title' }, '设置别名'),
          h('p', { className: 'dst-modal-copy' }, `原会话标题：${originalTitle || '未命名'}`),
          h('label', { className: 'dst-modal-field' }, '别名',
            h('input', { className: 'dst-modal-input', value: alias, maxLength: 300, autoFocus: true, placeholder: '留空则恢复原会话标题', onChange: (event) => setAlias(event.target.value), onKeyDown: (event) => { if (event.key === 'Enter') void save() } })),
          error ? h('div', { className: 'dst-error-text' }, error) : null,
          h('div', { className: 'dst-modal-actions' },
            h('button', { type: 'button', className: 'dst-button', onClick: onClose }, '取消'),
            h('button', { type: 'button', className: 'dst-button dst-button--primary', disabled: saving, onClick: () => void save() }, saving ? '保存中…' : '保存'))))
    }

    function ConfirmDialog({ title, message, confirmLabel, danger, onClose, onConfirm }) {
      const [error, setError] = useState('')
      const [saving, setSaving] = useState(false)
      useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])
      const confirm = async () => {
        setSaving(true)
        setError('')
        try {
          await onConfirm()
        } catch (failure) {
          setError(failure?.message || '操作失败')
        } finally {
          setSaving(false)
        }
      }
      return h('div', { className: 'dst-modal-backdrop', onMouseDown: (event) => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: 'dst-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
          h('h2', { className: 'dst-modal-title' }, title),
          h('p', { className: 'dst-modal-copy' }, message),
          error ? h('div', { className: 'dst-error-text' }, error) : null,
          h('div', { className: 'dst-modal-actions' },
            h('button', { type: 'button', className: 'dst-button', onClick: onClose }, '取消'),
            h('button', { type: 'button', className: `dst-button ${danger ? 'dst-button--danger' : 'dst-button--primary'}`, disabled: saving, onClick: () => void confirm() }, saving ? '处理中…' : confirmLabel))))
    }

    function buildModel(data, list, workspaces, statuses, workspaceFilter, query) {
      const workspaceItems = workspaces?.items || []
      const archived = new Set(workspaces?.archivedSessionIds || [])
      const bySession = new Map()
      for (const workspace of workspaceItems) {
        for (const sessionId of workspace.sessionIds || []) bySession.set(sessionId, workspace)
      }
      const normalizedQuery = String(query || '').trim().toLocaleLowerCase()
      const filter = workspaceFilter || 'all'
      const matchesFilter = (sessionId) => {
        if (filter === 'all') return true
        const workspace = bySession.get(sessionId)
        if (filter === 'ungrouped') return workspace === undefined
        return workspace?.workspaceId === filter
      }
      const matchesQuery = (...values) => {
        if (!normalizedQuery) return true
        return values.some((value) => String(value || '').toLocaleLowerCase().includes(normalizedQuery))
      }
      const resolve = (sessionId, task) => {
        const row = list?.byId?.[sessionId]
        const workspace = bySession.get(sessionId)
        const title = task?.alias || row?.displayTitle || task?.title || sessionId
        return {
          sessionId,
          row,
          workspace,
          task,
          title,
          workspaceTitle: workspace?.title || '未分组',
          running: Boolean(statuses?.get?.(sessionId)?.running || row?.running || data?.sessions?.[sessionId]?.running),
          pendingKind: visiblePendingKind(statuses?.get?.(sessionId)?.pendingInteraction?.kind),
          unavailable: !row && !workspace,
          archived: archived.has(sessionId),
        }
      }

      const unread = []
      const resultIds = new Set(Object.keys(data?.results || {}))
      for (const [id, info] of Object.entries(data?.sessions || {})) if (info.running || info.pendingKind) resultIds.add(id)
      for (const [sessionId] of statuses || []) {
        const pending = visiblePendingKind(statuses.get(sessionId)?.pendingInteraction?.kind)
        if (pending || statuses.get(sessionId)?.running) resultIds.add(sessionId)
      }
      for (const [id, row] of Object.entries(list?.byId || {})) if (row.running) resultIds.add(id)
      for (const sessionId of resultIds) {
        if (archived.has(sessionId)) continue
        const result = data?.results?.[sessionId]
        const read = data?.read?.[sessionId] ?? 0
        const isUnread = Boolean(result && result.version > read)
        const pendingKind = visiblePendingKind(statuses?.get(sessionId)?.pendingInteraction?.kind) || data?.sessions?.[sessionId]?.pendingKind
        const running = Boolean(statuses?.get?.(sessionId)?.running || list?.byId?.[sessionId]?.running || data?.sessions?.[sessionId]?.running)
        if (!isUnread && !pendingKind && !running) continue
        if (!matchesFilter(sessionId)) continue
        const resolved = resolve(sessionId, data?.tasks?.[sessionId])
        if (!matchesQuery(resolved.title, resolved.workspaceTitle, resolved.task?.note, result?.kind, pendingKind)) continue
        const statusKind = pendingKind || (running ? 'running' : result?.kind) || 'completed'
        unread.push({
          ...resolved,
          result,
          pendingKind,
          statusKind,
          unread: isUnread,
          at: pendingKind
            ? (resolved.row?.updatedAt || Date.now())
            : (result?.at || resolved.row?.updatedAt || 0),
        })
      }
      unread.sort((left, right) => Number(right.running) - Number(left.running) || (right.at || 0) - (left.at || 0))

      const active = []
      const completed = []
      for (const task of Object.values(data?.tasks || {})) {
        if (!matchesFilter(task.sessionId)) continue
        const resolved = resolve(task.sessionId, task)
        if (!matchesQuery(resolved.title, resolved.workspaceTitle, task.note, task.alias)) continue
        const group = data?.groups?.find(candidate => candidate.id === task.groupId) || data?.groups?.find(candidate => candidate.id === 'default') || { id: 'default', name: '默认分组', color: '#8BBFA8' }
        const row = { ...resolved, group, task }
        if (task.completed) completed.push(row)
        else active.push(row)
      }
      const orderedGroups = (data?.groups || []).map((group) => ({
        ...group,
        tasks: active
          .filter((row) => row.group.id === group.id)
          .sort((left, right) => (right.task.updatedAt || 0) - (left.task.updatedAt || 0)),
      }))
      const rawGroups = data?.groups || []
      completed.sort((left, right) => (right.task.completedAt || 0) - (left.task.completedAt || 0))
      return {
        unread,
        groups: orderedGroups,
        activeCount: active.length,
        completed,
        rawGroups,
      }
    }

    function visiblePendingKind(kind) {
      switch (kind) {
        case 'approval':
        case 'plan-review':
        case 'question':
          return kind
        default:
          return null
      }
    }

    function countUnread(data) {
      if (!data) return 0
      let count = 0
      for (const [sessionId, result] of Object.entries(data.results || {})) {
        if (result.version > (data.read?.[sessionId] ?? 0)) count += 1
      }
      return count
    }

    function resolveTitle(list, sessionId, task) {
      return task?.alias || list?.byId?.[sessionId]?.displayTitle || task?.title || sessionId
    }

    function resolveOriginalTitle(list, sessionId, task) {
      return list?.byId?.[sessionId]?.displayTitle || task?.title || ''
    }

    function taskStatus(kind, running, unread, pendingKind, isSubagent, completed) {
      if (pendingKind === 'approval') return { label: '等待审批', tone: 'warn' }
      if (pendingKind === 'plan-review') return { label: '计划待审', tone: 'warn' }
      if (pendingKind === 'question') return { label: '等待回答', tone: 'warn' }
      if (completed) return { label: '已完成待办', tone: 'success' }
      if (isSubagent && running === true) return { label: '子代理结果 · 运行中', tone: 'running', spinner: true }
      if (isSubagent) return { label: kind === 'error' ? '子代理异常' : '子代理结果', tone: kind === 'error' ? 'error' : 'warn' }
      if (running === true) return { label: '运行中', tone: 'running', spinner: true }
      switch (kind) {
        case 'error':
          return { label: '异常', tone: 'error' }
        case 'blocked':
          return { label: '已阻塞', tone: 'warn' }
        case 'attention':
          return { label: '需关注', tone: 'warn' }
        case 'interrupted':
          return { label: '已中断', tone: 'warn' }
        default:
          return unread ? { label: '新结果', tone: 'warn' } : { label: '等待处理', tone: 'muted' }
      }
    }

    function unreadStatus(row) {
      if (row.pendingKind === 'approval') return { label: '等待审批', tone: 'warn' }
      if (row.pendingKind === 'plan-review') return { label: '计划待审', tone: 'warn' }
      if (row.pendingKind === 'question') return { label: '等待回答', tone: 'warn' }
      const child = Boolean(row.result?.sourceSessionId && row.result.sourceSessionId !== row.sessionId)
      if (child && row.statusKind === 'error') return { label: '子代理异常', tone: 'error' }
      if (child && row.statusKind === 'blocked') return { label: '子代理已阻塞', tone: 'warn' }
      if (child && row.running) return { label: '子代理结果 · 运行中', tone: 'running', spinner: true }
      if (child) return { label: '子代理结果', tone: 'warn' }
      if (row.statusKind === 'error') return { label: '异常', tone: 'error' }
      if (row.statusKind === 'blocked') return { label: '已阻塞', tone: 'warn' }
      if (row.statusKind === 'attention') return { label: '需关注', tone: 'warn' }
      if (row.statusKind === 'interrupted') return { label: '已中断', tone: 'warn' }
      if (row.running) return { label: row.unread ? '新结果 · 进行中' : '进行中', tone: 'running', spinner: true }
      return { label: '新结果', tone: 'warn' }
    }

    function relativeTime(time) {
      if (!time) return ''
      const delta = Math.max(0, Date.now() - time)
      if (delta < 60_000) return '刚刚'
      if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`
      if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`
      if (delta < 30 * 86_400_000) return `${Math.floor(delta / 86_400_000)} 天前`
      return new Date(time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
    }

    function installParentStyles() {
      const existing = document.querySelector('style[data-dsh-session-todo="true"]')
      if (existing) return () => {}
      const style = document.createElement('style')
      style.dataset.dshSessionTodo = 'true'
      style.textContent = CSS
      document.head.appendChild(style)
      return () => style.remove()
    }

    function apply(ctx) {
      controller = new TodoController(ctx)
      const disposeStyles = installParentStyles()
      const disposeLifecycle = controller.start()
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'dsh-session-todo-desktop2',
        order: 500,
        label: '会话待办',
      }, FooterAction))
      ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'dsh-session-todo-desktop2-add',
        order: 40,
        label: '加入待办',
      }, HeaderAction))
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({ name: 'sidebar.workspaces.session.menu.item', id: 'dsh-session-todo-desktop2-add', order: 250 }, TopicTodoMenu))
      ctx.slots.inject('sidebar.workspaces.session.row.action', () => ctx.slots.register({ name: 'sidebar.workspaces.session.row.action', id: 'dsh-session-todo-desktop2-context', order: 1000 }, TopicContextMenu))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'dsh-session-todo-desktop2-float',
        order: 1000,
        label: '会话待办浮窗',
      }, FloatingHost))
      ctx.effect(() => () => {
        disposeStyles()
        disposeLifecycle()
      }, 'dsh-session-todo: client resources')
    }

    return {
      inject: ['connection', 'slots', 'uiWorkspace', 'sessions', 'uiSession'],
      apply,
    }
  },
})
