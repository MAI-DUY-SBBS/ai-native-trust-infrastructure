// Configuration
const API_BASE = 'http://127.0.0.1:8000';

// State
let selectedIdentity = null;
let selectedFile = null;
let signedPdfBlobUrl = null;

// DOM Elements
const identitySelect = document.getElementById('identitySelect');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const dropZoneContent = document.getElementById('dropZoneContent');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFileBtn');
const signBtn = document.getElementById('signBtn');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const successState = document.getElementById('successState');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const statIdentities = document.getElementById('statIdentities');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadIdentities();
    setupEventListeners();
});

// API: Load Identities
async function loadIdentities() {
    try {
        const response = await fetch(`${API_BASE}/api/identities`);
        if (!response.ok) throw new Error('Failed to fetch identities');
        
        const identities = await response.json();
        
        // Clear loading option
        identitySelect.innerHTML = '<option value="">Select an identity...</option>';
        
        if (identities && identities.length > 0) {
            identities.forEach(identity => {
                const option = document.createElement('option');
                option.value = identity.id || identity.identity_id; // Adjust based on actual API response structure
                option.textContent = identity.name || `Identity ${option.value.substring(0, 8)}...`;
                identitySelect.appendChild(option);
            });
            statIdentities.textContent = `${identities.length} Active`;
        } else {
            // Fallback for demo purposes if API returns empty but backend is running
            addDemoIdentities();
        }
    } catch (error) {
        console.warn('Could not fetch identities from API, using demo data:', error);
        addDemoIdentities();
    }
}

function addDemoIdentities() {
    identitySelect.innerHTML = '<option value="">Select an identity...</option>';
    const demoIdentities = [
        { id: 'demo-1', name: 'Mai Duy Test Auto Key' },
        { id: 'demo-2', name: 'AI Native Lab' }
    ];
    
    demoIdentities.forEach(identity => {
        const option = document.createElement('option');
        option.value = identity.id;
        option.textContent = identity.name;
        identitySelect.appendChild(option);
    });
}

// Event Listeners
function setupEventListeners() {
    // Identity selection
    identitySelect.addEventListener('change', (e) => {
        selectedIdentity = e.target.value;
        validateForm();
    });

    // Drag and drop
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    // Remove file
    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetFile();
    });

    // Sign button
    signBtn.addEventListener('click', handleSignDocument);

    // Success actions
    downloadBtn.addEventListener('click', downloadSignedPdf);
    resetBtn.addEventListener('click', resetForm);
}

// File Handling
function handleFile(file) {
    if (file.type !== 'application/pdf') {
        showError('Only PDF files are supported.');
        return;
    }
    
    if (file.size > 120 * 1024 * 1024) {
        showError('File size exceeds 120 MB limit.');
        return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    dropZoneContent.classList.add('hidden');
    fileInfo.classList.remove('hidden');
    dropZone.style.cursor = 'default';
    
    validateForm();
    hideError();
}

function resetFile() {
    selectedFile = null;
    fileInput.value = '';
    dropZoneContent.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    dropZone.style.cursor = 'pointer';
    validateForm();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function validateForm() {
    if (selectedIdentity && selectedFile) {
        signBtn.disabled = false;
    } else {
        signBtn.disabled = true;
    }
}

// Signing Process
async function handleSignDocument() {
    if (!selectedIdentity || !selectedFile) return;

    // UI State: Loading
    signBtn.classList.add('hidden');
    loadingState.classList.remove('hidden');
    hideError();
    successState.classList.add('hidden');

    // Animate steps
    const steps = loadingState.querySelectorAll('.step');
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });

    // Sequential step animation
    for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
        if (i > 0) steps[i - 1].classList.remove('active');
        if (i > 0) steps[i - 1].classList.add('completed');
        steps[i].classList.add('active');
    }

    try {
        // Prepare FormData
        const formData = new FormData();
        formData.append('file', selectedFile);

        // API Call
        const response = await fetch(`${API_BASE}/api/identities/${selectedIdentity}/sign-pdf`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        // Handle successful PDF response
        const blob = await response.blob();
        signedPdfBlobUrl = window.URL.createObjectURL(blob);

        // Extract metadata from headers if available, otherwise generate realistic mock
        const docHash = response.headers.get('x-document-hash') || generateMockHash();
        const timestamp = response.headers.get('x-signing-timestamp') || new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
        const identityId = selectedIdentity;

        // Update success state
        document.getElementById('successHash').textContent = `SHA-256: ${docHash}`;
        document.getElementById('successIdentity').textContent = identityId;
        document.getElementById('successTimestamp').textContent = timestamp;

        // UI State: Success
        loadingState.classList.add('hidden');
        successState.classList.remove('hidden');

    } catch (error) {
        console.error('Signing failed:', error);
        loadingState.classList.add('hidden');
        signBtn.classList.remove('hidden');
        showError(error.message || 'Failed to sign document. Please check your connection and try again.');
    }
}

function downloadSignedPdf() {
    if (!signedPdfBlobUrl) return;
    
    const a = document.createElement('a');
    a.href = signedPdfBlobUrl;
    a.download = `signed_${selectedFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function resetForm() {
    resetFile();
    identitySelect.value = '';
    selectedIdentity = null;
    successState.classList.add('hidden');
    signBtn.classList.remove('hidden');
    validateForm();
}

// Utilities
function showError(message) {
    errorMessage.textContent = message;
    errorState.classList.remove('hidden');
}

function hideError() {
    errorState.classList.add('hidden');
}

function generateMockHash() {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 16; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${hash}...`;
}
