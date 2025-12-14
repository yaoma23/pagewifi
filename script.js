// Mock WiFi networks for development (remove when ESP32 backend is available)
const MOCK_NETWORKS = [
    'HomeWiFi',
    'OfficeNetwork',
    'GuestNetwork',
    'NeighborWiFi',
    'MyNetwork_5G',
    'PublicWiFi',
    'SecureNetwork',
    'TestNetwork'
];

function scanNetworks() {
    const spinner = document.getElementById('spinner');
    const networksDiv = document.getElementById('networks');
    
    spinner.classList.add('active');
    networksDiv.innerHTML = '';
    
    // Try to fetch from ESP32 backend
    fetch('/scan', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            spinner.classList.remove('active');
            
            if (!data.networks || data.networks.length === 0) {
                networksDiv.innerHTML = 
                    '<p style="text-align:center;color:var(--gray400);padding:16px;">No networks found</p>';
                return;
            }
            
            displayNetworks(data.networks);
        })
        .catch(err => {
            console.log('Backend scan failed, using mock networks for development:', err);
            // Fallback to mock networks for development
            spinner.classList.remove('active');
            
            // Simulate network scan delay
            setTimeout(() => {
                displayNetworks(MOCK_NETWORKS);
            }, 1000);
        });
}

function displayNetworks(networks) {
    const networksDiv = document.getElementById('networks');
    
    if (networks.length === 0) {
        networksDiv.innerHTML = 
            '<p style="text-align:center;color:var(--gray400);padding:16px;">No networks found</p>';
        return;
    }
    
    let html = '';
    networks.forEach(net => {
        // Escape single quotes and other special characters
        const escapedNet = net.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += '<button type="button" class="network-btn" onclick="selectNetwork(\'' + 
                escapedNet + '\')">📶 ' + net + '</button>';
    });
    networksDiv.innerHTML = html;
}

function selectNetwork(ssid) {
    document.getElementById('ssid').value = ssid;
    document.getElementById('password').focus();
}

// Handle form submission
document.getElementById('configForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const messageDiv = document.getElementById('message');
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="button-icon">⏳</span><span>Saving...</span>';
    messageDiv.innerHTML = '';
    messageDiv.className = 'message';
    
    const formData = new FormData(this);
    const params = new URLSearchParams(formData);
    
    fetch('/save', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: params
    })
    .then(r => r.json())
    .then(data => {
        messageDiv.className = 'message success';
        messageDiv.innerHTML = '✓ Saved! Device restarting...';
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    })
    .catch(err => {
        messageDiv.className = 'message error';
        messageDiv.innerHTML = '✗ Error saving config. Please try again.';
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
});

// Auto-scan on page load
window.onload = function() {
    setTimeout(scanNetworks, 500);
};