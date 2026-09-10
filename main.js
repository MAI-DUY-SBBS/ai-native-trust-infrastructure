'use strict';

/*
 * AI-Native Trust Infrastructure
 * Frontend Application
 *
 * This file is intentionally independent from the HTML/CSS files.
 * The IDs/classes below are the contract that main.html and styles.css
 * should follow.
 */

// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE = 'https://ai-native-trust-infrastructure.onrender.com';

const MAX_PDF_SIZE = 120 * 1024 * 1024;

const API = {
    health: `${API_BASE}/api/health`,
    identities: `${API_BASE}/api/identities`,

    createIdentity: `${API_BASE}/api/identities`,

    identity: (identityId) =>
        `${API_BASE}/api/identities/${encodeURIComponent(identityId)}`,

    generateKeys: (identityId) =>
        `${API_BASE}/api/identities/${encodeURIComponent(identityId)}/keys`,

    signText: (identityId) =>
        `${API_BASE}/api/identities/${encodeURIComponent(identityId)}/sign`,

    verifyText: (identityId) =>
        `${API_BASE}/api/identities/${encodeURIComponent(identityId)}/verify`,

    signPDF: (identityId) =>
        `${API_BASE}/api/identities/${encodeURIComponent(identityId)}/sign-pdf`
};


// ============================================================
// APPLICATION STATE
// ============================================================

const state = {
    currentView: 'dashboard',

    identities: [],

    selectedIdentity: null,

    selectedFile: null,

    signedDocument: null,

    apiOnline: false,

    loading: false
};


// ============================================================
// DOM HELPERS
// ============================================================

function $(selector, root = document) {
    return root.querySelector(selector);
}

function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApplication();
});


async function initializeApplication() {
    setupNavigation();
    setupGlobalEvents();

    await loadIdentities();
    await checkApiHealth();

    renderCurrentView();
}


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {
    const navItems = $$('.nav-item');

    navItems.forEach((item) => {
        item.addEventListener('click', (event) => {
            event.preventDefault();

            const view = item.dataset.view;

            if (!view) {
                return;
            }

            navigateTo(view);
        });
    });
}


function navigateTo(view) {
    const validViews = [
        'dashboard',
        'identities',
        'sign',
        'verify',
        'registry'
    ];

    if (!validViews.includes(view)) {
        return;
    }

    state.currentView = view;

    updateNavigationState();

    renderCurrentView();

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


function updateNavigationState() {
    $$('.nav-item').forEach((item) => {
        const view = item.dataset.view;

        item.classList.toggle(
            'active',
            view === state.currentView
        );
    });
}


// ============================================================
// GLOBAL EVENTS
// ============================================================

function setupGlobalEvents() {
    document.addEventListener('click', handleGlobalClick);

    document.addEventListener('change', handleGlobalChange);

    document.addEventListener('submit', handleGlobalSubmit);

    document.addEventListener(
        'dragover',
        handleGlobalDragOver
    );

    document.addEventListener(
        'drop',
        handleGlobalDrop
    );
}


function handleGlobalClick(event) {
    const actionElement = event.target.closest('[data-action]');

    if (!actionElement) {
        return;
    }

    const action = actionElement.dataset.action;

    switch (action) {
        case 'go-dashboard':
            navigateTo('dashboard');
            break;

        case 'go-identities':
            navigateTo('identities');
            break;

        case 'go-sign':
            navigateTo('sign');
            break;

        case 'go-verify':
            navigateTo('verify');
            break;

        case 'go-registry':
            navigateTo('registry');
            break;

        case 'create-identity':
            handleCreateIdentity();
            break;

        case 'generate-key':
            handleGenerateKey(
                actionElement.dataset.identityId
            );
            break;

        case 'select-identity':
            handleSelectIdentity(
                actionElement.dataset.identityId
            );
            break;

        case 'remove-file':
            removeSelectedFile();
            break;

        case 'sign-document':
            handleSignDocument();
            break;

        case 'download-signed':
            downloadSignedDocument();
            break;

        case 'clear-sign-result':
            clearSignResult();
            break;

        case 'calculate-hash':
            calculateVerificationHash();
            break;

        case 'refresh-identities':
            refreshIdentities();
            break;

        case 'refresh-registry':
            refreshRegistry();
            break;

        default:
            break;
    }
}


function handleGlobalChange(event) {
    const target = event.target;

    if (target.matches('#identitySelect')) {
        handleIdentitySelection(target.value);
        return;
    }

    if (target.matches('#pdfFileInput')) {
        handleFileSelection(target.files?.[0]);
        return;
    }

    if (target.matches('#verificationFileInput')) {
        handleVerificationFileSelection(
            target.files?.[0]
        );
    }
}


function handleGlobalSubmit(event) {
    const form = event.target;

    if (form.matches('#createIdentityForm')) {
        event.preventDefault();

        handleCreateIdentity();
    }
}


function handleGlobalDragOver(event) {
    const dropZone = event.target.closest(
        '[data-drop-zone]'
    );

    if (!dropZone) {
        return;
    }

    event.preventDefault();

    dropZone.classList.add('dragover');
}


function handleGlobalDrop(event) {
    const dropZone = event.target.closest(
        '[data-drop-zone]'
    );

    if (!dropZone) {
        return;
    }

    event.preventDefault();

    dropZone.classList.remove('dragover');

    const file = event.dataTransfer?.files?.[0];

    if (!file) {
        return;
    }

    if (dropZone.dataset.dropZone === 'pdf') {
        handleFileSelection(file);
    }

    if (dropZone.dataset.dropZone === 'verification') {
        handleVerificationFileSelection(file);
    }
}


// ============================================================
// VIEW RENDERING
// ============================================================

function renderCurrentView() {
    const container = getViewContainer();

    if (!container) {
        return;
    }

    switch (state.currentView) {
        case 'dashboard':
            container.innerHTML = renderDashboard();
            break;

        case 'identities':
            container.innerHTML = renderIdentities();
            break;

        case 'sign':
            container.innerHTML = renderSignDocument();
            break;

        case 'verify':
            container.innerHTML = renderVerifySignature();
            break;

        case 'registry':
            container.innerHTML = renderTrustRegistry();
            break;

        default:
            container.innerHTML = renderDashboard();
            break;
    }

    updatePageHeader();
}


function getViewContainer() {
    return $(
        '#viewContainer, #appView, #mainContent, .view-container'
    );
}


function updatePageHeader() {
    const titles = {
        dashboard: {
            title: 'Dashboard',
            subtitle: 'AI-Native Trust Infrastructure'
        },

        identities: {
            title: 'Digital Identities',
            subtitle: 'Manage cryptographic identities'
        },

        sign: {
            title: 'Sign Document',
            subtitle: 'Create a cryptographic PDF signature'
        },

        verify: {
            title: 'Verify Signature',
            subtitle: 'Inspect document integrity and trust'
        },

        registry: {
            title: 'Trust Registry',
            subtitle: 'Local identity and trust records'
        }
    };

    const config =
        titles[state.currentView] ||
        titles.dashboard;

    const titleElement = $(
        '#pageTitle, [data-page-title]'
    );

    const subtitleElement = $(
        '#pageSubtitle, [data-page-subtitle]'
    );

    if (titleElement) {
        titleElement.textContent = config.title;
    }

    if (subtitleElement) {
        subtitleElement.textContent = config.subtitle;
    }
}


// ============================================================
// DASHBOARD
// ============================================================

function renderDashboard() {
    const identityCount = state.identities.length;

    return `
        <section class="view-section dashboard-view">

            <div class="page-intro">
                <div>
                    <div class="eyebrow">
                        TRUST INFRASTRUCTURE
                    </div>

                    <h1>
                        Identity × Intelligence × Trust
                    </h1>

                    <p>
                        A local reference implementation for
                        cryptographic identity and document trust.
                    </p>
                </div>

                <div class="system-status">
                    <span class="status-dot ${
                        state.apiOnline
                            ? 'online'
                            : 'offline'
                    }"></span>

                    <span>
                        ${
                            state.apiOnline
                                ? 'API Online'
                                : 'API Offline'
                        }
                    </span>
                </div>
            </div>

            <div class="stats-grid">

                ${renderStatCard(
                    'Digital Identities',
                    identityCount,
                    'identities',
                    'identity'
                )}

                ${renderStatCard(
                    'PDF Signing',
                    state.apiOnline
                        ? 'READY'
                        : 'OFFLINE',
                    'cryptographic signing',
                    'shield'
                )}

                ${renderStatCard(
                    'Trust Model',
                    'LOCAL',
                    'reference implementation',
                    'network'
                )}

            </div>

            <div class="dashboard-grid">

                <article class="card dashboard-card">

                    <div class="card-header">
                        <div>
                            <span class="eyebrow">
                                GET STARTED
                            </span>

                            <h2>
                                Create your digital identity
                            </h2>
                        </div>
                    </div>

                    <p class="card-description">
                        Create an identity that can be bound
                        to cryptographic keys and used to sign
                        documents.
                    </p>

                    <button
                        class="btn btn-primary"
                        data-action="go-identities"
                    >
                        Digital Identities
                    </button>

                </article>


                <article class="card dashboard-card">

                    <div class="card-header">
                        <div>
                            <span class="eyebrow">
                                DOCUMENT TRUST
                            </span>

                            <h2>
                                Sign a PDF
                            </h2>
                        </div>
                    </div>

                    <p class="card-description">
                        Select a cryptographic identity,
                        upload a PDF and create an embedded
                        digital signature.
                    </p>

                    <button
                        class="btn btn-secondary"
                        data-action="go-sign"
                    >
                        Sign Document
                    </button>

                </article>

            </div>


            <article class="card architecture-card">

                <div class="card-header">

                    <div>
                        <span class="eyebrow">
                            REFERENCE ARCHITECTURE
                        </span>

                        <h2>
                            Trust chain
                        </h2>
                    </div>

                </div>

                <div class="trust-chain">

                    ${renderTrustStep(
                        '01',
                        'Digital Identity',
                        'Who is acting?'
                    )}

                    <div class="chain-arrow">→</div>

                    ${renderTrustStep(
                        '02',
                        'Cryptographic Key',
                        'Can the identity prove control?'
                    )}

                    <div class="chain-arrow">→</div>

                    ${renderTrustStep(
                        '03',
                        'Digital Signature',
                        'Was the document altered?'
                    )}

                    <div class="chain-arrow">→</div>

                    ${renderTrustStep(
                        '04',
                        'Trust Registry',
                        'Can the identity be trusted?'
                    )}

                </div>

            </article>

        </section>
    `;
}


function renderStatCard(
    label,
    value,
    description,
    icon
) {
    return `
        <article class="stat-card">

            <div class="stat-icon">
                ${getIcon(icon)}
            </div>

            <div class="stat-content">

                <div class="stat-label">
                    ${escapeHtml(label)}
                </div>

                <div class="stat-value">
                    ${escapeHtml(String(value))}
                </div>

                <div class="stat-description">
                    ${escapeHtml(description)}
                </div>

            </div>

        </article>
    `;
}


function renderTrustStep(
    number,
    title,
    description
) {
    return `
        <div class="trust-step">

            <div class="trust-number">
                ${number}
            </div>

            <div>
                <strong>
                    ${escapeHtml(title)}
                </strong>

                <span>
                    ${escapeHtml(description)}
                </span>
            </div>

        </div>
    `;
}


// ============================================================
// DIGITAL IDENTITIES
// ============================================================

function renderIdentities() {
    return `
        <section class="view-section identities-view">

            <div class="section-heading">

                <div>
                    <span class="eyebrow">
                        IDENTITY MANAGEMENT
                    </span>

                    <h1>
                        Digital Identities
                    </h1>

                    <p>
                        Create and manage identities used
                        for cryptographic operations.
                    </p>
                </div>

                <button
                    class="btn btn-secondary"
                    data-action="refresh-identities"
                >
                    Refresh
                </button>

            </div>


            <div class="identity-layout">

                <article class="card">

                    <div class="card-header">
                        <div>
                            <span class="eyebrow">
                                CREATE
                            </span>

                            <h2>
                                New Digital Identity
                            </h2>
                        </div>
                    </div>

                    <form
                        id="createIdentityForm"
                        class="identity-form"
                    >

                        <div class="form-group">

                            <label for="identityName">
                                Full Name
                            </label>

                            <input
                                id="identityName"
                                name="name"
                                type="text"
                                class="form-input"
                                placeholder="e.g. Mai Duy"
                                autocomplete="name"
                                required
                            >

                        </div>


                        <div class="form-group">

                            <label for="identityEmail">
                                Email
                                <span class="optional">
                                    optional
                                </span>
                            </label>

                            <input
                                id="identityEmail"
                                name="email"
                                type="email"
                                class="form-input"
                                placeholder="name@example.com"
                                autocomplete="email"
                            >

                        </div>


                        <div class="form-group">

                            <label for="identityOrganization">
                                Organization
                                <span class="optional">
                                    optional
                                </span>
                            </label>

                            <input
                                id="identityOrganization"
                                name="organization"
                                type="text"
                                class="form-input"
                                placeholder="University / Organization"
                            >

                        </div>


                        <div
                            id="identityCreateMessage"
                            class="form-message hidden"
                        ></div>


                        <button
                            type="submit"
                            class="btn btn-primary btn-full"
                            id="createIdentityButton"
                        >
                            Create Digital Identity
                        </button>

                    </form>

                </article>


                <article class="card">

                    <div class="card-header">

                        <div>
                            <span class="eyebrow">
                                IDENTITIES
                            </span>

                            <h2>
                                Registered identities
                            </h2>
                        </div>

                        <span class="badge">
                            ${state.identities.length}
                        </span>

                    </div>


                    <div
                        id="identityList"
                        class="identity-list"
                    >
                        ${renderIdentityList()}
                    </div>

                </article>

            </div>

        </section>
    `;
}


function renderIdentityList() {
    if (!state.identities.length) {
        return `
            <div class="empty-state">

                <div class="empty-icon">
                    ${getIcon('identity')}
                </div>

                <h3>
                    No digital identities
                </h3>

                <p>
                    Create your first identity to begin
                    signing documents.
                </p>

            </div>
        `;
    }

    return state.identities
        .map(identity => renderIdentityCard(identity))
        .join('');
}


function renderIdentityCard(identity) {
    const identityId =
        getIdentityId(identity);

    const name =
        identity.name ||
        'Unnamed Identity';

    const email =
        identity.email ||
        'No email registered';

    const organization =
        identity.organization ||
        'No organization';

    const createdAt =
        identity.created_at
            ? formatDate(identity.created_at)
            : 'Unknown';

    const selected =
        state.selectedIdentity === identityId;

    return `
        <div class="
            identity-card
            ${selected ? 'selected' : ''}
        ">

            <div class="identity-avatar">
                ${getInitials(name)}
            </div>


            <div class="identity-main">

                <div class="identity-name">
                    ${escapeHtml(name)}
                </div>

                <div class="identity-meta">
                    ${escapeHtml(email)}
                </div>

                <div class="identity-meta">
                    ${escapeHtml(organization)}
                </div>

                <div class="identity-created">
                    Created ${escapeHtml(createdAt)}
                </div>

            </div>


            <div class="identity-actions">

                <button
                    class="btn btn-small btn-secondary"
                    data-action="select-identity"
                    data-identity-id="${escapeAttribute(identityId)}"
                >
                    Use
                </button>

                <button
                    class="btn btn-small btn-ghost"
                    data-action="generate-key"
                    data-identity-id="${escapeAttribute(identityId)}"
                >
                    Generate Key
                </button>

            </div>

        </div>
    `;
}


// ============================================================
// SIGN DOCUMENT
// ============================================================

function renderSignDocument() {
    const hasIdentities =
        state.identities.length > 0;

    return `
        <section class="view-section sign-view">

            <div class="section-heading">

                <div>
                    <span class="eyebrow">
                        CRYPTOGRAPHIC SIGNING
                    </span>

                    <h1>
                        Sign PDF Document
                    </h1>

                    <p>
                        Bind a PDF document to a digital
                        identity using a cryptographic signature.
                    </p>
                </div>

            </div>


            ${
                !hasIdentities
                    ? renderNoIdentityNotice()
                    : ''
            }


            <div class="sign-layout">

                <article class="card sign-card">

                    <div class="card-header">

                        <div>
                            <span class="step-number">
                                01
                            </span>

                            <div>
                                <span class="eyebrow">
                                    SIGNER
                                </span>

                                <h2>
                                    Select identity
                                </h2>
                            </div>
                        </div>

                    </div>


                    <div class="form-group">

                        <label for="identitySelect">
                            Digital Identity
                        </label>

                        <select
                            id="identitySelect"
                            class="form-select"
                            ${
                                !hasIdentities
                                    ? 'disabled'
                                    : ''
                            }
                        >

                            <option value="">
                                Select an identity
                            </option>

                            ${state.identities
                                .map(identity => {
                                    const id =
                                        getIdentityId(
                                            identity
                                        );

                                    const selected =
                                        state.selectedIdentity === id;

                                    return `
                                        <option
                                            value="${escapeAttribute(id)}"
                                            ${
                                                selected
                                                    ? 'selected'
                                                    : ''
                                            }
                                        >
                                            ${escapeHtml(
                                                identity.name ||
                                                id
                                            )}
                                        </option>
                                    `;
                                })
                                .join('')}

                        </select>

                    </div>


                    <div
                        id="selectedIdentityInfo"
                        class="${
                            state.selectedIdentity
                                ? ''
                                : 'hidden'
                        }"
                    >
                        ${
                            state.selectedIdentity
                                ? renderSelectedIdentityInfo()
                                : ''
                        }
                    </div>

                </article>


                <article class="card sign-card">

                    <div class="card-header">

                        <div>
                            <span class="step-number">
                                02
                            </span>

                            <div>
                                <span class="eyebrow">
                                    DOCUMENT
                                </span>

                                <h2>
                                    Upload PDF
                                </h2>
                            </div>
                        </div>

                    </div>


                    <div
                        class="drop-zone ${
                            state.selectedFile
                                ? 'has-file'
                                : ''
                        }"
                        data-drop-zone="pdf"
                    >

                        ${
                            state.selectedFile
                                ? renderSelectedFile()
                                : renderFileDropPrompt()
                        }

                    </div>


                    <input
                        id="pdfFileInput"
                        type="file"
                        accept="application/pdf,.pdf"
                        class="visually-hidden"
                    >


                    <div class="file-actions">

                        <label
                            for="pdfFileInput"
                            class="btn btn-secondary"
                        >
                            ${
                                state.selectedFile
                                    ? 'Choose Another PDF'
                                    : 'Choose PDF'
                            }
                        </label>

                        ${
                            state.selectedFile
                                ? `
                                    <button
                                        class="btn btn-ghost"
                                        data-action="remove-file"
                                    >
                                        Remove
                                    </button>
                                `
                                : ''
                        }

                    </div>


                    <div class="file-limit">
                        Maximum file size: 120 MB
                    </div>

                </article>

            </div>


            <article class="card signing-action-card">

                ${
                    renderSignStatus()
                }


                <div class="seal-preview">

                    <div class="seal">
                        <div class="seal-inner">
                            <div class="seal-symbol">
                                ✓
                            </div>

                            <div class="seal-title">
                                DIGITALLY SIGNED
                            </div>

                            <div class="seal-subtitle">
                                AI-NATIVE TRUST
                            </div>
                        </div>
                    </div>

                </div>


                <div class="sign-action-content">

                    <span class="eyebrow">
                        FINAL ACTION
                    </span>

                    <h2>
                        Create cryptographic signature
                    </h2>

                    <p>
                        The server will create an embedded
                        PDF signature using the selected
                        digital identity.
                    </p>

                    <button
                        class="btn btn-primary btn-large"
                        data-action="sign-document"
                        ${
                            !state.selectedIdentity ||
                            !state.selectedFile ||
                            state.loading
                                ? 'disabled'
                                : ''
                        }
                    >
                        ${
                            state.loading
                                ? 'Signing…'
                                : 'Sign PDF Document'
                        }
                    </button>

                </div>

            </article>

        </section>
    `;
}


function renderNoIdentityNotice() {
    return `
        <div class="notice notice-warning">

            <div class="notice-icon">
                !
            </div>

            <div>

                <strong>
                    No digital identity available
                </strong>

                <p>
                    Create a digital identity before
                    signing a document.
                </p>

            </div>

            <button
                class="btn btn-secondary"
                data-action="go-identities"
            >
                Create Identity
            </button>

        </div>
    `;
}


function renderSelectedIdentityInfo() {
    const identity =
        state.identities.find(
            item =>
                getIdentityId(item) ===
                state.selectedIdentity
        );

    if (!identity) {
        return '';
    }

    return `
        <div class="selected-identity">

            <div class="identity-avatar">
                ${getInitials(
                    identity.name || ''
                )}
            </div>

            <div>

                <strong>
                    ${escapeHtml(
                        identity.name ||
                        'Unnamed Identity'
                    )}
                </strong>

                <span>
                    ${
                        escapeHtml(
                            identity.organization ||
                            'Individual'
                        )
                    }
                </span>

            </div>

            <div class="identity-check">
                ✓
            </div>

        </div>
    `;
}


function renderFileDropPrompt() {
    return `
        <div class="drop-content">

            <div class="drop-icon">
                ${getIcon('document')}
            </div>

            <h3>
                Drop your PDF here
            </h3>

            <p>
                or choose a PDF file from your computer
            </p>

        </div>
    `;
}


function renderSelectedFile() {
    if (!state.selectedFile) {
        return '';
    }

    return `
        <div class="selected-file">

            <div class="file-icon">
                PDF
            </div>

            <div class="file-info">

                <strong>
                    ${escapeHtml(
                        state.selectedFile.name
                    )}
                </strong>

                <span>
                    ${formatFileSize(
                        state.selectedFile.size
                    )}
                </span>

            </div>

            <div class="file-ready">
                READY
            </div>

        </div>
    `;
}


function renderSignStatus() {
    if (state.signedDocument) {
        return `
            <div class="sign-result success-state">

                <div class="result-icon">
                    ✓
                </div>

                <div class="result-content">

                    <span class="eyebrow">
                        SIGNATURE CREATED
                    </span>

                    <h3>
                        PDF signed successfully
                    </h3>

                    <p>
                        The signed document is ready.
                    </p>

                    ${
                        state.signedDocument.hash
                            ? `
                                <div class="hash-line">
                                    <span>
                                        Document hash
                                    </span>

                                    <code>
                                        ${escapeHtml(
                                            state.signedDocument.hash
                                        )}
                                    </code>
                                </div>
                            `
                            : ''
                    }

                </div>

                <div class="result-actions">

                    <button
                        class="btn btn-primary"
                        data-action="download-signed"
                    >
                        Download Signed PDF
                    </button>

                    <button
                        class="btn btn-ghost"
                        data-action="clear-sign-result"
                    >
                        Sign Another
                    </button>

                </div>

            </div>
        `;
    }

    return `
        <div
            id="signError"
            class="form-message hidden"
        ></div>
    `;
}


// ============================================================
// VERIFY SIGNATURE
// ============================================================

function renderVerifySignature() {
    return `
        <section class="view-section verify-view">

            <div class="section-heading">

                <div>
                    <span class="eyebrow">
                        VERIFICATION
                    </span>

                    <h1>
                        Verify Signature
                    </h1>

                    <p>
                        Inspect the document fingerprint and
                        prepare it for cryptographic verification.
                    </p>
                </div>

            </div>


            <div class="notice notice-info">

                <div class="notice-icon">
                    i
                </div>

                <div>

                    <strong>
                        Verification architecture
                    </strong>

                    <p>
                        A SHA-256 fingerprint proves the exact
                        byte-level identity of the uploaded file.
                        Full embedded PDF signature validation
                        belongs to the backend verification layer.
                    </p>

                </div>

            </div>


            <article class="card verification-card">

                <div class="card-header">

                    <div>
                        <span class="eyebrow">
                            DOCUMENT
                        </span>

                        <h2>
                            Select PDF to inspect
                        </h2>
                    </div>

                </div>


                <div
                    class="drop-zone"
                    data-drop-zone="verification"
                >

                    <div class="drop-content">

                        <div class="drop-icon">
                            ${getIcon('document')}
                        </div>

                        <h3>
                            Drop PDF here
                        </h3>

                        <p>
                            Calculate its SHA-256 document fingerprint.
                        </p>

                    </div>

                </div>


                <input
                    id="verificationFileInput"
                    type="file"
                    accept="application/pdf,.pdf"
                    class="visually-hidden"
                >


                <div class="file-actions">

                    <label
                        for="verificationFileInput"
                        class="btn btn-secondary"
                    >
                        Choose PDF
                    </label>

                </div>


                <div
                    id="verificationResult"
                    class="verification-result hidden"
                ></div>

            </article>


            <article class="card verification-model">

                <div class="card-header">

                    <div>
                        <span class="eyebrow">
                            TRUST MODEL
                        </span>

                        <h2>
                            What verification must establish
                        </h2>
                    </div>

                </div>


                <div class="verification-grid">

                    ${renderVerificationPoint(
                        '01',
                        'Integrity',
                        'The document has not changed after signing.'
                    )}

                    ${renderVerificationPoint(
                        '02',
                        'Authenticity',
                        'The signature corresponds to the signer’s public key.'
                    )}

                    ${renderVerificationPoint(
                        '03',
                        'Identity',
                        'The certificate identifies the signing identity.'
                    )}

                    ${renderVerificationPoint(
                        '04',
                        'Trust',
                        'The identity and certificate chain are trusted.'
                    )}

                </div>

            </article>

        </section>
    `;
}


function renderVerificationPoint(
    number,
    title,
    description
) {
    return `
        <div class="verification-point">

            <div class="verification-number">
                ${number}
            </div>

            <div>

                <strong>
                    ${escapeHtml(title)}
                </strong>

                <p>
                    ${escapeHtml(description)}
                </p>

            </div>

        </div>
    `;
}


// ============================================================
// TRUST REGISTRY
// ============================================================

function renderTrustRegistry() {
    return `
        <section class="view-section registry-view">

            <div class="section-heading">

                <div>
                    <span class="eyebrow">
                        TRUST REGISTRY
                    </span>

                    <h1>
                        Local Trust Registry
                    </h1>

                    <p>
                        A view of identities currently known
                        to the local reference implementation.
                    </p>
                </div>

                <button
                    class="btn btn-secondary"
                    data-action="refresh-registry"
                >
                    Refresh
                </button>

            </div>


            <article class="card registry-card">

                <div class="registry-header">

                    <div>
                        <span class="eyebrow">
                            REGISTERED IDENTITIES
                        </span>

                        <h2>
                            Trust entries
                        </h2>
                    </div>

                    <span class="badge">
                        ${state.identities.length}
                    </span>

                </div>


                ${
                    state.identities.length
                        ? renderRegistryTable()
                        : renderEmptyRegistry()
                }

            </article>


            <div class="notice notice-info">

                <div class="notice-icon">
                    i
                </div>

                <div>

                    <strong>
                        Prototype trust boundary
                    </strong>

                    <p>
                        These records represent the current
                        local identity layer. A production trust
                        registry should additionally establish
                        certificate status, revocation, policy,
                        audit records and trusted issuers.
                    </p>

                </div>

            </div>

        </section>
    `;
}


function renderRegistryTable() {
    return `
        <div class="table-wrapper">

            <table class="registry-table">

                <thead>
                    <tr>
                        <th>
                            Identity
                        </th>

                        <th>
                            Organization
                        </th>

                        <th>
                            Created
                        </th>

                        <th>
                            Status
                        </th>
                    </tr>
                </thead>

                <tbody>

                    ${state.identities
                        .map(identity => {

                            const name =
                                identity.name ||
                                'Unnamed Identity';

                            const organization =
                                identity.organization ||
                                'Individual';

                            const created =
                                identity.created_at
                                    ? formatDate(
                                        identity.created_at
                                    )
                                    : 'Unknown';

                            return `
                                <tr>

                                    <td>

                                        <div class="table-identity">

                                            <div class="identity-avatar small">
                                                ${getInitials(
                                                    name
                                                )}
                                            </div>

                                            <div>

                                                <strong>
                                                    ${escapeHtml(
                                                        name
                                                    )}
                                                </strong>

                                                <code>
                                                    ${escapeHtml(
                                                        getIdentityId(
                                                            identity
                                                        )
                                                    )}
                                                </code>

                                            </div>

                                        </div>

                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            organization
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            created
                                        )}
                                    </td>

                                    <td>

                                        <span class="status-badge">
                                            <span class="status-dot online"></span>
                                            Registered
                                        </span>

                                    </td>

                                </tr>
                            `;
                        })
                        .join('')}

                </tbody>

            </table>

        </div>
    `;
}


function renderEmptyRegistry() {
    return `
        <div class="empty-state">

            <div class="empty-icon">
                ${getIcon('network')}
            </div>

            <h3>
                Registry is empty
            </h3>

            <p>
                Create a digital identity to establish
                the first trust entry.
            </p>

            <button
                class="btn btn-primary"
                data-action="go-identities"
            >
                Create Identity
            </button>

        </div>
    `;
}


// ============================================================
// IDENTITY API
// ============================================================

async function loadIdentities() {
    try {
        const response =
            await fetch(API.identities);

        if (!response.ok) {
            throw new Error(
                `Unable to load identities (${response.status})`
            );
        }

        const data =
            await response.json();

        state.identities =
            normalizeIdentityResponse(data);

    } catch (error) {
        console.error(
            'Failed to load identities:',
            error
        );

        state.identities = [];
    }
}


function normalizeIdentityResponse(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.identities)) {
        return data.identities;
    }

    if (data?.identity) {
        return [data.identity];
    }

    return [];
}


async function refreshIdentities() {
    await loadIdentities();

    renderCurrentView();
}


async function handleCreateIdentity() {
    const form =
        $('#createIdentityForm');

    if (!form) {
        return;
    }

    const name =
        $('#identityName')?.value.trim();

    const email =
        $('#identityEmail')?.value.trim() || '';

    const organization =
        $('#identityOrganization')
            ?.value.trim() || '';

    if (!name) {
        showIdentityMessage(
            'Please enter the full name.',
            'error'
        );

        return;
    }

    const button =
        $('#createIdentityButton');

    setButtonLoading(
        button,
        true,
        'Creating…'
    );

    try {
        const params =
            new URLSearchParams();

        params.set('name', name);
        params.set('email', email);
        params.set(
            'organization',
            organization
        );

        const response =
            await fetch(
                `${API.createIdentity}?${params.toString()}`,
                {
                    method: 'POST'
                }
            );

        const data =
            await parseApiResponse(response);

        if (!response.ok) {
            throw new Error(
                getApiErrorMessage(
                    data,
                    response.status
                )
            );
        }

        const identity =
            data.identity ||
            data;

        const identityId =
            getIdentityId(identity);

        /*
         * Identity creation and key generation are kept as
         * two explicit cryptographic lifecycle operations.
         */
        if (identityId) {
            await generateKeyForIdentity(
                identityId
            );
        }

        await loadIdentities();

        state.selectedIdentity =
            identityId;

        showIdentityMessage(
            'Digital identity created successfully.',
            'success'
        );

        /*
         * Move the user directly to signing after successful
         * identity creation.
         */
        setTimeout(() => {
            navigateTo('sign');
        }, 500);

    } catch (error) {
        console.error(
            'Create identity failed:',
            error
        );

        showIdentityMessage(
            error.message ||
            'Unable to create identity.',
            'error'
        );

    } finally {
        setButtonLoading(
            button,
            false,
            'Create Digital Identity'
        );
    }
}


async function handleGenerateKey(identityId) {
    if (!identityId) {
        return;
    }

    const identity =
        state.identities.find(
            item =>
                getIdentityId(item) === identityId
        );

    const name =
        identity?.name ||
        identityId;

    const confirmed =
        window.confirm(
            `Generate a new cryptographic key for "${name}"?`
        );

    if (!confirmed) {
        return;
    }

    try {
        await generateKeyForIdentity(
            identityId
        );

        showToast(
            'Cryptographic key generated successfully.',
            'success'
        );

    } catch (error) {
        console.error(
            'Key generation failed:',
            error
        );

        showToast(
            error.message ||
            'Unable to generate cryptographic key.',
            'error'
        );
    }
}


async function generateKeyForIdentity(
    identityId
) {
    const response =
        await fetch(
            API.generateKeys(identityId),
            {
                method: 'POST'
            }
        );

    const data =
        await parseApiResponse(response);

    if (!response.ok) {
        throw new Error(
            getApiErrorMessage(
                data,
                response.status
            )
        );
    }

    return data;
}


async function handleSelectIdentity(
    identityId
) {
    if (!identityId) {
        return;
    }

    state.selectedIdentity =
        identityId;

    navigateTo('sign');
}


function handleIdentitySelection(
    identityId
) {
    state.selectedIdentity =
        identityId || null;

    const info =
        $('#selectedIdentityInfo');

    if (info) {
        if (state.selectedIdentity) {
            info.innerHTML =
                renderSelectedIdentityInfo();

            info.classList.remove('hidden');
        } else {
            info.innerHTML = '';
            info.classList.add('hidden');
        }
    }

    updateSignButton();
}


// ============================================================
// PDF FILE HANDLING
// ============================================================

function handleFileSelection(file) {
    if (!file) {
        return;
    }

    const validation =
        validatePDF(file);

    if (!validation.valid) {
        showSignError(
            validation.message
        );

        return;
    }

    clearSignError();

    state.selectedFile = file;

    state.signedDocument = null;

    renderCurrentView();
}


function validatePDF(file) {
    const isPDF =
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf');

    if (!isPDF) {
        return {
            valid: false,
            message: 'Please select a PDF file.'
        };
    }

    if (file.size > MAX_PDF_SIZE) {
        return {
            valid: false,
            message:
                'The PDF exceeds the 120 MB file size limit.'
        };
    }

    return {
        valid: true
    };
}


function removeSelectedFile() {
    state.selectedFile = null;

    state.signedDocument = null;

    renderCurrentView();
}


function updateSignButton() {
    const button =
        $('[data-action="sign-document"]');

    if (!button) {
        return;
    }

    button.disabled =
        !state.selectedIdentity ||
        !state.selectedFile ||
        state.loading;
}


// ============================================================
// PDF SIGNING
// ============================================================

async function handleSignDocument() {
    if (state.loading) {
        return;
    }

    if (!state.selectedIdentity) {
        showSignError(
            'Please select a digital identity first.'
        );

        return;
    }

    if (!state.selectedFile) {
        showSignError(
            'Please select a PDF document first.'
        );

        return;
    }

    const validation =
        validatePDF(
            state.selectedFile
        );

    if (!validation.valid) {
        showSignError(
            validation.message
        );

        return;
    }

    state.loading = true;

    clearSignError();

    renderCurrentView();

    try {
        const formData =
            new FormData();

        formData.append(
            'file',
            state.selectedFile
        );

        const response =
            await fetch(
                API.signPDF(
                    state.selectedIdentity
                ),
                {
                    method: 'POST',
                    body: formData
                }
            );

        if (!response.ok) {
            const errorData =
                await parseApiResponse(
                    response
                );

            throw new Error(
                getApiErrorMessage(
                    errorData,
                    response.status
                )
            );
        }

        const blob =
            await response.blob();

        const identity =
            state.identities.find(
                item =>
                    getIdentityId(item) ===
                    state.selectedIdentity
            );

        state.signedDocument = {
            blob,

            filename:
                buildSignedFilename(
                    state.selectedFile.name
                ),

            signer:
                identity?.name ||
                state.selectedIdentity,

            identityId:
                state.selectedIdentity,

            hash:
                response.headers.get(
                    'X-AI-Native-Document-Hash'
                ),

            algorithm:
                response.headers.get(
                    'X-AI-Native-Algorithm'
                ),

            signedAt:
                response.headers.get(
                    'X-AI-Native-Signed-At'
                )
        };

    } catch (error) {
        console.error(
            'PDF signing failed:',
            error
        );

        state.signedDocument = null;

        showSignError(
            error.message ||
            'Unable to sign the PDF.'
        );

    } finally {
        state.loading = false;

        renderCurrentView();
    }
}


function buildSignedFilename(
    originalName
) {
    const extension =
        '.pdf';

    const base =
        originalName
            .replace(/\.pdf$/i, '');

    return `${base}-signed${extension}`;
}


function downloadSignedDocument() {
    const signed =
        state.signedDocument;

    if (!signed?.blob) {
        return;
    }

    const url =
        URL.createObjectURL(
            signed.blob
        );

    const anchor =
        document.createElement('a');

    anchor.href = url;

    anchor.download =
        signed.filename ||
        'signed-document.pdf';

    document.body.appendChild(
        anchor
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(url);
}


function clearSignResult() {
    state.signedDocument = null;

    state.selectedFile = null;

    renderCurrentView();
}


function showSignError(message) {
    const element =
        $('#signError');

    if (!element) {
        showToast(
            message,
            'error'
        );

        return;
    }

    element.textContent =
        message;

    element.className =
        'form-message error';

    element.classList.remove(
        'hidden'
    );
}


function clearSignError() {
    const element =
        $('#signError');

    if (!element) {
        return;
    }

    element.textContent = '';

    element.className =
        'form-message hidden';
}


// ============================================================
// PDF VERIFICATION / HASH
// ============================================================

async function handleVerificationFileSelection(
    file
) {
    if (!file) {
        return;
    }

    const validation =
        validatePDF(file);

    if (!validation.valid) {
        showVerificationError(
            validation.message
        );

        return;
    }

    const result =
        $('#verificationResult');

    if (!result) {
        return;
    }

    result.classList.remove(
        'hidden'
    );

    result.innerHTML = `
        <div class="verification-loading">
            Calculating SHA-256 fingerprint…
        </div>
    `;

    try {
        const hash =
            await calculateSHA256(file);

        result.innerHTML = `
            <div class="verification-hash">

                <div class="verification-result-icon">
                    ✓
                </div>

                <div class="verification-hash-content">

                    <span class="eyebrow">
                        SHA-256 DOCUMENT FINGERPRINT
                    </span>

                    <h3>
                        Fingerprint calculated
                    </h3>

                    <code>
                        ${escapeHtml(hash)}
                    </code>

                    <p>
                        This fingerprint represents the exact
                        uploaded file. It does not by itself
                        establish signer identity or certificate trust.
                    </p>

                </div>

            </div>
        `;

    } catch (error) {
        console.error(
            'Hash calculation failed:',
            error
        );

        showVerificationError(
            'Unable to calculate document fingerprint.'
        );
    }
}


async function calculateVerificationHash() {
    const input =
        $('#verificationFileInput');

    const file =
        input?.files?.[0];

    if (!file) {
        showVerificationError(
            'Please select a PDF first.'
        );

        return;
    }

    await handleVerificationFileSelection(
        file
    );
}


async function calculateSHA256(file) {
    const buffer =
        await file.arrayBuffer();

    const digest =
        await crypto.subtle.digest(
            'SHA-256',
            buffer
        );

    return Array.from(
        new Uint8Array(digest)
    )
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(2, '0')
        )
        .join('');
}


function showVerificationError(
    message
) {
    const result =
        $('#verificationResult');

    if (!result) {
        showToast(
            message,
            'error'
        );

        return;
    }

    result.classList.remove(
        'hidden'
    );

    result.innerHTML = `
        <div class="form-message error">
            ${escapeHtml(message)}
        </div>
    `;
}


// ============================================================
// TRUST REGISTRY
// ============================================================

async function refreshRegistry() {
    await loadIdentities();

    renderCurrentView();
}


// ============================================================
// API HEALTH
// ============================================================

async function checkApiHealth() {
    try {
        const response =
            await fetch(
                API.health,
                {
                    method: 'GET',
                    cache: 'no-store'
                }
            );

        state.apiOnline =
            response.ok;

    } catch (error) {
        console.error(
            'API health check failed:',
            error
        );

        state.apiOnline = false;
    }

    updateApiStatus();
}


function updateApiStatus() {
    const statusElements =
        $$('[data-api-status]');

    statusElements.forEach(
        element => {

            element.classList.toggle(
                'online',
                state.apiOnline
            );

            element.classList.toggle(
                'offline',
                !state.apiOnline
            );

            const text =
                element.querySelector(
                    '[data-api-status-text]'
                );

            if (text) {
                text.textContent =
                    state.apiOnline
                        ? 'API Online'
                        : 'API Offline';
            }
        }
    );
}


// ============================================================
// ERROR / MESSAGE UI
// ============================================================

function showIdentityMessage(
    message,
    type
) {
    const element =
        $('#identityCreateMessage');

    if (!element) {
        showToast(
            message,
            type
        );

        return;
    }

    element.textContent =
        message;

    element.className =
        `form-message ${type}`;

    element.classList.remove(
        'hidden'
    );
}


function showToast(
    message,
    type = 'info'
) {
    let container =
        $('#toastContainer');

    if (!container) {
        container =
            document.createElement('div');

        container.id =
            'toastContainer';

        container.className =
            'toast-container';

        document.body.appendChild(
            container
        );
    }

    const toast =
        document.createElement('div');

    toast.className =
        `toast toast-${type}`;

    toast.textContent =
        message;

    container.appendChild(
        toast
    );

    requestAnimationFrame(() => {
        toast.classList.add(
            'visible'
        );
    });

    setTimeout(() => {
        toast.classList.remove(
            'visible'
        );

        setTimeout(() => {
            toast.remove();
        }, 250);

    }, 3500);
}


function setButtonLoading(
    button,
    loading,
    loadingText
) {
    if (!button) {
        return;
    }

    if (loading) {
        button.dataset.originalText =
            button.textContent;

        button.disabled = true;

        button.textContent =
            loadingText;
    } else {
        button.disabled = false;

        button.textContent =
            button.dataset.originalText ||
            button.textContent;
    }
}


// ============================================================
// API RESPONSE HELPERS
// ============================================================

async function parseApiResponse(
    response
) {
    const contentType =
        response.headers.get(
            'content-type'
        ) || '';

    if (
        contentType.includes(
            'application/json'
        )
    ) {
        return await response.json();
    }

    const text =
        await response.text();

    return {
        message: text
    };
}


function getApiErrorMessage(
    data,
    status
) {
    if (data?.detail) {
        if (typeof data.detail === 'string') {
            return data.detail;
        }

        if (Array.isArray(data.detail)) {
            return data.detail
                .map(
                    item =>
                        item.msg ||
                        JSON.stringify(item)
                )
                .join('; ');
        }
    }

    if (data?.message) {
        return data.message;
    }

    return `Request failed (${status}).`;
}


// ============================================================
// IDENTITY HELPERS
// ============================================================

function getIdentityId(
    identity
) {
    if (!identity) {
        return '';
    }

    return String(
        identity.id ||
        identity.identity_id ||
        identity.uuid ||
        ''
    );
}


function getInitials(
    name
) {
    const value =
        String(name || '')
            .trim();

    if (!value) {
        return '?';
    }

    const parts =
        value.split(/\s+/);

    if (parts.length === 1) {
        return parts[0]
            .slice(0, 2)
            .toUpperCase();
    }

    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


// ============================================================
// FORMATTERS
// ============================================================

function formatDate(
    value
) {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return new Intl.DateTimeFormat(
        'en',
        {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }
    ).format(date);
}


function formatFileSize(
    bytes
) {
    if (!Number.isFinite(bytes)) {
        return 'Unknown size';
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;
    }

    if (
        bytes <
        1024 * 1024 * 1024
    ) {
        return `${(
            bytes /
            (1024 * 1024)
        ).toFixed(1)} MB`;
    }

    return `${(
        bytes /
        (1024 * 1024 * 1024)
    ).toFixed(2)} GB`;
}


// ============================================================
// SECURITY / HTML HELPERS
// ============================================================

function escapeHtml(
    value
) {
    return String(
        value ?? ''
    )
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );
}


function escapeAttribute(
    value
) {
    return escapeHtml(
        value
    );
}


// ============================================================
// ICONS
// ============================================================

function getIcon(
    name
) {
    const icons = {

        identity: `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <circle
                    cx="12"
                    cy="8"
                    r="3"
                ></circle>

                <path
                    d="M5 20c.8-3.3 3.1-5 7-5s6.2 1.7 7 5"
                ></path>
            </svg>
        `,

        shield: `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path
                    d="M12 3l7 3v5c0 4.8-3 8-7 10-4-2-7-5.2-7-10V6l7-3z"
                ></path>

                <path
                    d="M9 12l2 2 4-4"
                ></path>
            </svg>
        `,

        network: `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <circle
                    cx="6"
                    cy="12"
                    r="2"
                ></circle>

                <circle
                    cx="18"
                    cy="6"
                    r="2"
                ></circle>

                <circle
                    cx="18"
                    cy="18"
                    r="2"
                ></circle>

                <path
                    d="M8 11l8-4"
                ></path>

                <path
                    d="M8 13l8 4"
                ></path>
            </svg>
        `,

        document: `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path
                    d="M6 3h8l4 4v14H6z"
                ></path>

                <path
                    d="M14 3v5h5"
                ></path>

                <path
                    d="M9 13h6"
                ></path>

                <path
                    d="M9 17h4"
                ></path>
            </svg>
        `
    };

    return (
        icons[name] ||
        icons.document
    );
}


// ============================================================
// PUBLIC DEBUG API
// ============================================================

window.TrustInfrastructure = {
    state,

    navigateTo,

    loadIdentities,

    checkApiHealth,

    calculateSHA256
};
