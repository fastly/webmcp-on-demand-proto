const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Escape a value for safe interpolation into HTML. */
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Decode a URI component without throwing on malformed input. */
function safeDecode(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

// ─── Shared Layout ───────────────────────────────────────────────────────────

function layout(title, body, { activeNav = "" } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — SkyRoute</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="/" class="nav-brand">
        <svg class="nav-logo" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 18L14 6l11 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 22h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        SkyRoute
      </a>
      <div class="nav-links">
        <a href="/" class="${activeNav === "home" ? "active" : ""}">Flights</a>
        <a href="/support" class="${activeNav === "support" ? "active" : ""}">Support</a>
      </div>
    </div>
  </nav>
  <main>${body}</main>
  <footer class="footer">
    <div class="footer-inner">
      <p class="footer-note">This site has no WebMCP implementation. All agent capabilities are injected by Fastly at the edge.</p>
      <p class="footer-copy">&copy; 2026 SkyRoute. Demo purposes only.</p>
    </div>
  </footer>
</body>
</html>`;
}

// ─── Homepage ────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.send(
    layout(
      "Find Your Next Flight",
      `
    <section class="hero">
      <div class="hero-inner">
        <h1 class="hero-title">Where will you fly next?</h1>
        <p class="hero-subtitle">Search hundreds of airlines and find your perfect flight in seconds.</p>

        <form action="/search" method="POST" class="search-form" id="flight-search" aria-label="Flight search">
          <div class="form-row">
            <div class="form-group">
              <label for="trip_type">Trip type</label>
              <select id="trip_type" name="trip_type" required>
                <option value="round-trip">Round trip</option>
                <option value="one-way">One way</option>
              </select>
            </div>
            <div class="form-group">
              <label for="passengers">Passengers</label>
              <input type="number" id="passengers" name="passengers" min="1" max="9" value="1" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group form-group--wide">
              <label for="origin">From</label>
              <input type="text" id="origin" name="origin" placeholder="e.g. SFO" required pattern="[A-Za-z]{3}" maxlength="3" autocomplete="off">
            </div>
            <div class="form-swap">
              <span aria-hidden="true">&harr;</span>
            </div>
            <div class="form-group form-group--wide">
              <label for="destination">To</label>
              <input type="text" id="destination" name="destination" placeholder="e.g. JFK" required pattern="[A-Za-z]{3}" maxlength="3" autocomplete="off">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group form-group--wide">
              <label for="departure_date">Departure</label>
              <input type="date" id="departure_date" name="departure_date" required>
            </div>
            <div class="form-group form-group--wide">
              <label for="return_date">Return</label>
              <input type="date" id="return_date" name="return_date">
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-lg">Search Flights</button>
        </form>
      </div>
    </section>

    <section class="destinations">
      <div class="container">
        <h2 class="section-title">Popular destinations</h2>
        <div class="destinations-grid">
          <a href="/search" class="destination-card">
            <img src="https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&h=400&fit=crop" alt="Tokyo skyline" loading="lazy">
            <div class="destination-info">
              <h3>Tokyo</h3>
              <p>From $489</p>
            </div>
          </a>
          <a href="/search" class="destination-card">
            <img src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop" alt="Paris at sunset" loading="lazy">
            <div class="destination-info">
              <h3>Paris</h3>
              <p>From $312</p>
            </div>
          </a>
          <a href="/search" class="destination-card">
            <img src="https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=600&h=400&fit=crop" alt="New York City" loading="lazy">
            <div class="destination-info">
              <h3>New York</h3>
              <p>From $198</p>
            </div>
          </a>
          <a href="/search" class="destination-card">
            <img src="https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&h=400&fit=crop" alt="Sydney Opera House" loading="lazy">
            <div class="destination-info">
              <h3>Sydney</h3>
              <p>From $621</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  `,
      { activeNav: "home" }
    )
  );
});

// ─── Search Results ──────────────────────────────────────────────────────────

const FLIGHTS = [
  {
    id: "SR-1024",
    airline: "SkyRoute Express",
    origin: "SFO",
    destination: "JFK",
    departure: "06:00 AM",
    arrival: "02:35 PM",
    duration: "5h 35m",
    stops: "Nonstop",
    price: 289,
  },
  {
    id: "SR-2048",
    airline: "Pacific Airways",
    origin: "SFO",
    destination: "JFK",
    departure: "09:15 AM",
    arrival: "06:42 PM",
    duration: "6h 27m",
    stops: "1 stop (DEN)",
    price: 214,
  },
  {
    id: "SR-3072",
    airline: "Continental Blue",
    origin: "SFO",
    destination: "JFK",
    departure: "12:30 PM",
    arrival: "08:58 PM",
    duration: "5h 28m",
    stops: "Nonstop",
    price: 342,
  },
  {
    id: "SR-4096",
    airline: "Meridian Airlines",
    origin: "SFO",
    destination: "JFK",
    departure: "04:45 PM",
    arrival: "02:10 AM+1",
    duration: "6h 25m",
    stops: "1 stop (ORD)",
    price: 178,
  },
  {
    id: "SR-5120",
    airline: "Atlas Air",
    origin: "SFO",
    destination: "JFK",
    departure: "10:00 PM",
    arrival: "06:15 AM+1",
    duration: "5h 15m",
    stops: "Nonstop",
    price: 259,
  },
];

function renderSearchResults(params, res) {
  const { origin: orig, destination: dest, departure_date, passengers } = params;
  const displayOrigin = esc((orig || "SFO").toUpperCase());
  const displayDest = esc((dest || "JFK").toUpperCase());
  const displayDate = esc(departure_date || "2026-04-15");
  const pax = parseInt(passengers, 10) || 1;

  const flightCards = FLIGHTS.map(
    (f) => `
    <div class="flight-card">
      <div class="flight-airline">${f.airline}</div>
      <div class="flight-details">
        <div class="flight-time">
          <span class="flight-time-main">${f.departure}</span>
          <span class="flight-airport">${displayOrigin}</span>
        </div>
        <div class="flight-route">
          <span class="flight-duration">${f.duration}</span>
          <div class="flight-line"></div>
          <span class="flight-stops">${f.stops}</span>
        </div>
        <div class="flight-time">
          <span class="flight-time-main">${f.arrival}</span>
          <span class="flight-airport">${displayDest}</span>
        </div>
      </div>
      <div class="flight-price-section">
        <span class="flight-price">$${f.price}</span>
        <span class="flight-price-note">per person</span>
        <a href="/book?flight=${f.id}&origin=${encodeURIComponent(displayOrigin)}&destination=${encodeURIComponent(displayDest)}&date=${encodeURIComponent(displayDate)}&passengers=${pax}&price=${f.price}&airline=${encodeURIComponent(f.airline)}" class="btn btn-primary btn-sm">Select</a>
      </div>
    </div>
  `
  ).join("");

  res.send(
    layout(
      "Flight Results",
      `
    <section class="results-page">
      <div class="container">
        <div class="results-header">
          <h1>${displayOrigin} &rarr; ${displayDest}</h1>
          <p>${displayDate} &middot; ${pax} passenger${pax > 1 ? "s" : ""}</p>
        </div>

        <form action="/search" method="POST" class="filter-form" id="filter-results" aria-label="Filter flight results">
          <input type="hidden" name="origin" value="${displayOrigin}">
          <input type="hidden" name="destination" value="${displayDest}">
          <input type="hidden" name="departure_date" value="${displayDate}">
          <input type="hidden" name="passengers" value="${pax}">

          <div class="filter-row">
            <div class="filter-group">
              <label for="sort_by">Sort by</label>
              <select id="sort_by" name="sort_by">
                <option value="price">Price (lowest)</option>
                <option value="duration">Duration (shortest)</option>
                <option value="departure">Departure (earliest)</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="max_price">Max price ($)</label>
              <input type="number" id="max_price" name="max_price" placeholder="e.g. 300" min="0" step="10">
            </div>
            <div class="filter-group">
              <label for="stops">Stops</label>
              <select id="stops" name="stops">
                <option value="any">Any</option>
                <option value="nonstop">Nonstop only</option>
                <option value="1stop">1 stop max</option>
              </select>
            </div>
            <button type="submit" class="btn btn-secondary btn-sm">Apply Filters</button>
          </div>
        </form>

        <div class="flight-list">
          ${flightCards}
        </div>
      </div>
    </section>
  `,
      { activeNav: "home" }
    )
  );
}

app.post("/search", (req, res) => renderSearchResults(req.body, res));
app.get("/search", (req, res) => renderSearchResults(req.query, res));

// ─── Booking Page ────────────────────────────────────────────────────────────

app.get("/book", (req, res) => {
  const { flight, origin: orig, destination: dest, date, passengers, price, airline } = req.query;

  const safeAirline = esc(safeDecode(airline || "SkyRoute Express"));
  const safeFlight = esc(flight || "SR-1024");
  const safeOrig = esc(orig || "SFO");
  const safeDest = esc(dest || "JFK");
  const safeDate = esc(date || "2026-04-15");
  const safePax = parseInt(passengers, 10) || 1;
  const safePrice = parseInt(price, 10) || 289;

  res.send(
    layout(
      "Book Your Flight",
      `
    <section class="booking-page">
      <div class="container">
        <div class="booking-layout">
          <div class="booking-main">
            <h1>Passenger Details</h1>
            <p class="booking-subtitle">Complete the form below to book your flight.</p>

            <form action="/confirm" method="POST" class="booking-form" id="passenger-booking" aria-label="Passenger booking">
              <input type="hidden" name="flight" value="${safeFlight}">
              <input type="hidden" name="origin" value="${safeOrig}">
              <input type="hidden" name="destination" value="${safeDest}">
              <input type="hidden" name="date" value="${safeDate}">
              <input type="hidden" name="passengers" value="${safePax}">
              <input type="hidden" name="price" value="${safePrice}">
              <input type="hidden" name="airline" value="${safeAirline}">

              <fieldset>
                <legend>Personal Information</legend>
                <div class="form-row">
                  <div class="form-group form-group--wide">
                    <label for="first_name">First name</label>
                    <input type="text" id="first_name" name="first_name" placeholder="Jane" required autocomplete="given-name">
                  </div>
                  <div class="form-group form-group--wide">
                    <label for="last_name">Last name</label>
                    <input type="text" id="last_name" name="last_name" placeholder="Doe" required autocomplete="family-name">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group form-group--wide">
                    <label for="email">Email address</label>
                    <input type="email" id="email" name="email" placeholder="jane@example.com" required autocomplete="email">
                  </div>
                  <div class="form-group form-group--wide">
                    <label for="phone">Phone number</label>
                    <input type="tel" id="phone" name="phone" placeholder="+1 (555) 123-4567" required autocomplete="tel">
                  </div>
                </div>
                <div class="form-group">
                  <label for="dob">Date of birth</label>
                  <input type="date" id="dob" name="dob" required>
                </div>
              </fieldset>

              <fieldset>
                <legend>Payment Information</legend>
                <p class="fieldset-note">Demo only — no real payment will be processed.</p>
                <div class="form-group">
                  <label for="card_number">Card number</label>
                  <input type="text" id="card_number" name="card_number" placeholder="4242 4242 4242 4242" disabled autocomplete="cc-number">
                </div>
                <div class="form-row">
                  <div class="form-group form-group--wide">
                    <label for="card_exp">Expiration</label>
                    <input type="text" id="card_exp" name="card_exp" placeholder="MM / YY" disabled autocomplete="cc-exp">
                  </div>
                  <div class="form-group form-group--wide">
                    <label for="card_cvv">CVV</label>
                    <input type="text" id="card_cvv" name="card_cvv" placeholder="123" disabled autocomplete="cc-csc">
                  </div>
                </div>
              </fieldset>

              <button type="submit" class="btn btn-primary btn-lg">Complete Booking</button>
            </form>
          </div>

          <aside class="booking-summary">
            <h2>Flight Summary</h2>
            <div class="summary-card">
              <div class="summary-row">
                <span class="summary-label">Flight</span>
                <span class="summary-value">${safeFlight}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Airline</span>
                <span class="summary-value">${safeAirline}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Route</span>
                <span class="summary-value">${safeOrig} &rarr; ${safeDest}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Date</span>
                <span class="summary-value">${safeDate}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Passengers</span>
                <span class="summary-value">${safePax}</span>
              </div>
              <hr>
              <div class="summary-row summary-total">
                <span class="summary-label">Total</span>
                <span class="summary-value">$${safePrice * safePax}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `,
      { activeNav: "home" }
    )
  );
});

// ─── Confirmation Page ───────────────────────────────────────────────────────

app.post("/confirm", (req, res) => {
  const ref = "SKR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const { first_name, last_name, origin: orig, destination: dest, date, airline } = req.body;

  const safeName = esc(first_name || "traveler");
  const safeFirst = esc(first_name || "");
  const safeLast = esc(last_name || "");
  const safeOrig = esc(orig || "SFO");
  const safeDest = esc(dest || "JFK");
  const safeAirline = esc(safeDecode(airline || "SkyRoute Express"));
  const safeDate = esc(date || "2026-04-15");

  res.send(
    layout(
      "Booking Confirmed",
      `
    <section class="confirm-page">
      <div class="container">
        <div class="confirm-card">
          <div class="confirm-icon">&#10003;</div>
          <h1>Booking Confirmed!</h1>
          <p class="confirm-subtitle">Thank you, ${safeName}. Your flight has been booked.</p>

          <div class="confirm-details">
            <div class="confirm-row">
              <span class="confirm-label">Booking Reference</span>
              <span class="confirm-value confirm-ref">${ref}</span>
            </div>
            <div class="confirm-row">
              <span class="confirm-label">Passenger</span>
              <span class="confirm-value">${safeFirst} ${safeLast}</span>
            </div>
            <div class="confirm-row">
              <span class="confirm-label">Route</span>
              <span class="confirm-value">${safeOrig} &rarr; ${safeDest}</span>
            </div>
            <div class="confirm-row">
              <span class="confirm-label">Airline</span>
              <span class="confirm-value">${safeAirline}</span>
            </div>
            <div class="confirm-row">
              <span class="confirm-label">Date</span>
              <span class="confirm-value">${safeDate}</span>
            </div>
          </div>

          <p class="confirm-note">A confirmation email has been sent (not really — this is a demo).</p>
          <a href="/" class="btn btn-primary">Return to Home</a>
        </div>
      </div>
    </section>
  `,
      { activeNav: "home" }
    )
  );
});

// ─── Support Page ────────────────────────────────────────────────────────────

app.get("/support", (req, res) => {
  res.send(
    layout(
      "Customer Support",
      `
    <section class="support-page">
      <div class="container">
        <div class="support-layout">
          <div class="support-main">
            <h1>How can we help?</h1>
            <p class="support-subtitle">Submit a request and our team will get back to you within 24 hours.</p>

            <form action="/support/submit" method="POST" class="support-form" id="support-request" aria-label="Customer support request">
              <div class="form-row">
                <div class="form-group form-group--wide">
                  <label for="support_name">Your name</label>
                  <input type="text" id="support_name" name="name" placeholder="Jane Doe" required autocomplete="name">
                </div>
                <div class="form-group form-group--wide">
                  <label for="support_email">Email address</label>
                  <input type="email" id="support_email" name="email" placeholder="jane@example.com" required autocomplete="email">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group form-group--wide">
                  <label for="booking_ref">Booking reference <span class="optional">(optional)</span></label>
                  <input type="text" id="booking_ref" name="booking_ref" placeholder="e.g. SKR-A1B2C3">
                </div>
                <div class="form-group form-group--wide">
                  <label for="issue_category">Issue category</label>
                  <select id="issue_category" name="issue_category" required>
                    <option value="" disabled selected>Select a category</option>
                    <option value="flight_change">Flight change</option>
                    <option value="cancellation">Cancellation</option>
                    <option value="baggage">Baggage</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="message">Describe your issue</label>
                <textarea id="message" name="message" rows="5" placeholder="Please provide as much detail as possible..." required></textarea>
              </div>

              <button type="submit" class="btn btn-primary">Submit Request</button>
            </form>
          </div>

          <aside class="support-sidebar">
            <h2>Quick Answers</h2>
            <div class="faq-list">
              <details class="faq-item">
                <summary>How do I change my flight?</summary>
                <p>You can request a flight change by submitting a support request with your booking reference and preferred new dates.</p>
              </details>
              <details class="faq-item">
                <summary>What is the cancellation policy?</summary>
                <p>Flights can be cancelled up to 24 hours before departure for a full refund. Within 24 hours, a cancellation fee may apply.</p>
              </details>
              <details class="faq-item">
                <summary>My baggage is delayed. What do I do?</summary>
                <p>File a baggage report at the airport baggage service desk, then contact us with your report number for tracking assistance.</p>
              </details>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `,
      { activeNav: "support" }
    )
  );
});

app.post("/support/submit", (req, res) => {
  const ref = "TKT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  res.send(
    layout(
      "Request Submitted",
      `
    <section class="confirm-page">
      <div class="container">
        <div class="confirm-card">
          <div class="confirm-icon">&#10003;</div>
          <h1>Request Submitted</h1>
          <p class="confirm-subtitle">We've received your support request.</p>
          <div class="confirm-details">
            <div class="confirm-row">
              <span class="confirm-label">Ticket Number</span>
              <span class="confirm-value confirm-ref">${ref}</span>
            </div>
          </div>
          <p class="confirm-note">You'll receive a confirmation email shortly (not really — this is a demo).</p>
          <a href="/" class="btn btn-primary">Return to Home</a>
        </div>
      </div>
    </section>
  `,
      { activeNav: "support" }
    )
  );
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`SkyRoute origin server running at http://localhost:${PORT}`);
});
