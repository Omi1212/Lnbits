const API_KEY = ""; // Ingresar tu Admin Key de LNbits
const API_URL = ""; // Ingresar URL de tu instancia de LNbits
let walletId = ""; // Ingresar tu Wallet ID de LNbits

async function crearBote() {
  const nombre = document.getElementById("nombreBote").value;
  const meta = document.getElementById("metaBote").value;

  if (!nombre) {
    alert("Por favor, ingresa un nombre para el bote.");
    return;
  }

  try {
    const reponse = await fetch(`${API_URL}/api/v1/wallet`, {
      method: "POST",
      headers: {
        "X-Api-Key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: nombre }),
    });

    const data = await reponse.json();
    walletId = data.id;

    document.getElementById("crearBote").style.display = "none";
    document.getElementById("visualizarBote").style.display = "block";
    document.getElementById("contribuir").style.display = "block";

    document.getElementById("nombreBoteVisualizar").textContent = nombre;

    if (meta) {
      document.getElementById("metaVisualizar").textContent = meta;
    }

    const enlace = `${window.location.origin}${window.location.pathname}?bote=${walletId}`;
    document.getElementById("enlaceBote").textContent = enlace;
    generarQR(enlace);

    actualizarProgreso();
    setInterval(actualizarProgreso, 30000);

    iniciarWebSocket();
  } catch (error) {
    console.error("Error al crear el bote:", error);
    alert("Hubo error al crear el bote. Por favor, intenta de nuevo.");
  }
}

function generarQR(enlace) {
  const qr = qrcode(0, "M");
  qr.addData(enlace);
  qr.make();
  document.getElementById("qrCode").innerHTML = qr.createImgTag(5);
}

async function actualizarProgreso() {
  try {
    const response = await fetch(`${API_URL}/api/v1/wallet`, {
      headers: {
        "X-Api-Key": API_KEY,
      },
    });
    const data = await response.json();

    const totalRecaudado = data.balance / 1000;
    document.getElementById("totalRecaudado").textContent = totalRecaudado;

    const meta = parseInt(
      document.getElementById("metaVisualizar").textContent
    );

    if (!isNaN(meta)) {
      const porcentaje = (totalRecaudado / meta) * 100;
      document.getElementById("barraProgreso").style.width = `${Math.min(
        porcentaje,
        100
      )}%`;
    }
  } catch (error) {
    console.error("Error al actualizar el progreso:", error);
  }
}

async function generarFactura() {
  const monto = document.getElementById("montoDonacion").value;
  if (!monto || monto <= 0) {
    alert("Por favor, ingresa un monto válido para donar.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "X-Api-Key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        out: false,
        amount: monto,
        memo: "Contribución al Bote de Propinas",
      }),
    });
    const data = await response.json();

    document.getElementById("mensajeContribucion").innerHTML = `
               <p>Escanea este código QR para contribuir ${monto} sats:</p>
               <div id="qrFactura"></div>
               <p>O usa esta factura Lightning:</p>
               <textarea readonly>${data.payment_request}</textarea>
           `;

    generarQR(data.payment_request);
  } catch (error) {
    console.error("Error al generar la factura:", error);
    alert("Hubo un error al generar la factura. Por favor, intenta de nuevo.");
  }
}

function iniciarWebSocket() {
  const ws = new WebSocket(
    `wss://drearytoucan5.lnbits.com/api/v1/ws/${walletId}`
  );
  ws.onmessage = function (event) {
    const message = JSON.parse(event.data);
    if (message.type === "payment_received") {
      actualizarProgreso();
    }
  };
  ws.onerror = function (error) {
    console.error("WebSocket error:", error);
  };
  ws.onclose = function () {
    console.log("WebSocket closed. Reconnecting...");
    setTimeout(iniciarWebSocket, 5000);
  };
}

window.onload = function () {
  const urlParams = new URLSearchParams(window.location.search);
  const boteId = urlParams.get("bote");
  if (boteId) {
    walletId = boteId;
    document.getElementById("crearBote").style.display = "none";
    document.getElementById("visualizarBote").style.display = "block";
    document.getElementById("contribuir").style.display = "block";
    actualizarProgreso();
    setInterval(actualizarProgreso, 30000);
    iniciarWebSocket();
  }
};
