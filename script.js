function scanNetworks() {
    document.getElementById('spinner').style.display = 'block';
    document.getElementById('networks').innerHTML = '';
    
    fetch('/scan')
        .then(response => response.json())
        .then(data => {
            document.getElementById('spinner').style.display = 'none';
            
            if (data.networks.length === 0) {
                document.getElementById('networks').innerHTML = 
                    '<p style="text-align:center;color:#999;">No networks found</p>';
                return;
            }
            
            let html = '<div style="margin: 20px 0;">';
            data.networks.forEach(net => {
                html += '<button type="button" class="network-btn" onclick="selectNetwork(\'' + 
                        net + '\')">&#x1F4F6; ' + net + '</button>';
            });
            html += '</div>';
            document.getElementById('networks').innerHTML = html;
        })
        .catch(err => {
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('networks').innerHTML = 
                '<p style="text-align:center;color:red;">Scan failed</p>';
        });
}

function selectNetwork(ssid) {
    document.getElementById('ssid').value = ssid;
    document.getElementById('password').focus();
}

// Handle form submission
document.getElementById('configForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const params = new URLSearchParams(formData);
    
    fetch('/save', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: params
    })
    .then(r => r.json())
    .then(data => {
        document.getElementById('message').innerHTML = 
            '<p style="color: green; text-align: center;">&#x2713; Saved! Restarting...</p>';
    })
    .catch(err => {
        document.getElementById('message').innerHTML = 
            '<p style="color: red; text-align: center;">Error saving config</p>';
    });
});

// Auto-scan on page load
window.onload = function() {
    setTimeout(scanNetworks, 500);
};