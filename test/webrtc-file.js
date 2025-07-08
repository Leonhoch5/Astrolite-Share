let ws, peerConnection, dataChannel, remotePeerId;
const status = msg => document.getElementById('status').textContent += msg + '\n';

// --- Signaling helpers ---
function connectSignaling(onInit) {
    ws = new WebSocket(`ws://${location.host}`);
    ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'init') {
            window.myPeerId = msg.peerId;
            document.getElementById('peerId').textContent = msg.peerId;
            status('Your Peer ID: ' + msg.peerId);
            if (typeof onInit === 'function') onInit();
        } else if (msg.sdp) {
            await peerConnection.setRemoteDescription(msg.sdp);
            if (msg.sdp.type === 'offer') {
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                ws.send(JSON.stringify({ to: msg.from, sdp: peerConnection.localDescription }));
            }
        } else if (msg.candidate) {
            await peerConnection.addIceCandidate(msg.candidate);
        }
    };
}

// --- Auto-connect and get Peer ID on window load ---
window.addEventListener('DOMContentLoaded', () => {
    connectSignaling();
});

// --- Sender logic ---
window.startSender = async function () {
    if (!ws || ws.readyState !== 1) {
        connectSignaling(() => window.startSender());
        return;
    }
    status('Sender: Connecting...');
    peerConnection = new RTCPeerConnection();
    dataChannel = peerConnection.createDataChannel('file');
    setupDataChannelSender(dataChannel);

    peerConnection.onicecandidate = e => {
        if (e.candidate && remotePeerId)
            ws.send(JSON.stringify({ to: remotePeerId, candidate: e.candidate }));
    };

    // Wait for user to enter receiver peerId
    remotePeerId = prompt('Enter receiver Peer ID:');
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    ws.send(JSON.stringify({ to: remotePeerId, sdp: peerConnection.localDescription }));
};

function setupDataChannelSender(dc) {
    dc.onopen = async () => {
        status('DataChannel open. Sending file...');
        const file = document.getElementById('fileInput').files[0];
        if (!file) return status('No file selected.');
        const chunkSize = 16 * 1024;
        let offset = 0;
        while (offset < file.size) {
            const slice = file.slice(offset, offset + chunkSize);
            const buf = await slice.arrayBuffer();
            dc.send(buf);
            offset += chunkSize;
            status(`Sent ${offset}/${file.size}`);
        }
        dc.send('EOF');
        status('File sent!');
    };
}

// --- Receiver logic ---
window.startReceiver = async function () {
    if (!ws || ws.readyState !== 1) {
        connectSignaling(() => window.startReceiver());
        return;
    }
    status('Receiver: Connecting...');
    peerConnection = new RTCPeerConnection();

    peerConnection.ondatachannel = e => {
        const dc = e.channel;
        status('DataChannel received.');
        setupDataChannelReceiver(dc);
    };

    peerConnection.onicecandidate = e => {
        if (e.candidate && remotePeerId)
            ws.send(JSON.stringify({ to: remotePeerId, candidate: e.candidate }));
    };

    // Wait for user to enter sender peerId
    remotePeerId = prompt('Enter sender Peer ID:');
    status('Signaling connected.');
};

function setupDataChannelReceiver(dc) {
    let chunks = [];
    dc.onmessage = e => {
        if (typeof e.data === 'string' && e.data === 'EOF') {
            const blob = new Blob(chunks);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'received_file';
            a.click();
            status('File received and saved!');
            chunks = [];
        } else {
            chunks.push(e.data);
            status(`Received chunk (${chunks.length})`);
        }
    };
}