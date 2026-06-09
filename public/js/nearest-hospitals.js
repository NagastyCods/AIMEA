/**
 * Nearest hospitals: uses geolocation + /api/nearby-hospitals (OpenStreetMap / Overpass).
 * Mount panels with [data-nearest-hospitals] on the page.
 */
(function () {
	const SMS_BODY = 'Hello — I need urgent medical assistance. I am contacting you through the AIMEA emergency app.';
	const MAIL_SUBJECT = 'Medical emergency inquiry (AIMEA)';

	function escapeHtml(str) {
		if (!str) return '';
		const div = document.createElement('div');
		div.textContent = str;
		return div.innerHTML;
	}

	function cleanTelHref(phone) {
		if (!phone) return '';
		const trimmed = String(phone).trim().split(/[;/|]/)[0].trim();
		const digits = trimmed.replace(/[^\d+]/g, '');
		if (digits.startsWith('+')) return digits;
		if (digits.startsWith('00')) return '+' + digits.slice(2);
		return digits;
	}

	function formatDistance(m) {
		if (m < 1000) return `${m} m`;
		return `${(m / 1000).toFixed(1)} km`;
	}

	function requestLocation() {
		return new Promise((resolve) => {
			if (!navigator.geolocation) {
				resolve({ error: 'Geolocation is not supported in this browser.' });
				return;
			}
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					resolve({
						lat: pos.coords.latitude,
						lng: pos.coords.longitude
					});
				},
				() => {
					resolve({
						error: 'Location was denied or unavailable. Allow location access to find nearby hospitals.'
					});
				},
				{ enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
			);
		});
	}

	function renderList(container, hospitals) {
		container.innerHTML = '';
		if (!hospitals.length) {
			container.innerHTML = '<p class="hospitals-empty">No facilities matched in this radius. Try widening the search.</p>';
			return;
		}

		hospitals.forEach((h) => {
			const tel = h.phone ? cleanTelHref(h.phone) : '';
			const smsHref = tel ? `sms:${tel}?body=${encodeURIComponent(SMS_BODY)}` : '';
			const telHref = tel ? `tel:${tel}` : '';
			const mailHref = h.email
				? `mailto:${encodeURIComponent(h.email)}?subject=${encodeURIComponent(MAIL_SUBJECT)}`
				: '';
			const osmUrl = `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}#map=16/${h.lat}/${h.lon}`;
			const gMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${h.lat},${h.lon}`)}`;

			const actions = [];
			if (tel) {
				actions.push(
					`<a class="hospital-action" href="${telHref}"><i class="fa-solid fa-phone" aria-hidden="true"></i><span>Call</span></a>`
				);
				actions.push(
					`<a class="hospital-action" href="${smsHref}"><i class="fa-solid fa-message" aria-hidden="true"></i><span>SMS</span></a>`
				);
			} else {
				actions.push('<span class="hospital-action muted">No phone listed</span>');
			}
			if (h.email) {
				actions.push(
					`<a class="hospital-action" href="${mailHref}"><i class="fa-solid fa-envelope" aria-hidden="true"></i><span>Email</span></a>`
				);
			} else {
				actions.push('<span class="hospital-action muted">No email listed</span>');
			}
			actions.push(
				`<a class="hospital-action" href="${gMapsUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-route" aria-hidden="true"></i><span>Directions</span></a>`
			);
			actions.push(
				`<a class="hospital-action" href="${osmUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-map" aria-hidden="true"></i><span>Map</span></a>`
			);

			const article = document.createElement('article');
			article.className = 'hospital-card';
			article.innerHTML = `
				<div class="hospital-card-top">
					<h3 class="hospital-name">${escapeHtml(h.name)}</h3>
					<span class="hospital-distance">${formatDistance(h.distanceM)}</span>
				</div>
				${h.amenity ? `<p class="hospital-type">${escapeHtml(h.amenity)}</p>` : ''}
				<p class="hospital-address">${escapeHtml(h.address || 'Address not available in open data.')}</p>
				${h.phone ? `<p class="hospital-phone"><i class="fa-solid fa-phone" aria-hidden="true"></i> ${escapeHtml(h.phone)}</p>` : ''}
				<div class="hospital-actions">${actions.join('')}</div>
			`;
			container.appendChild(article);
		});
	}

	function initPanel(root) {
		const findBtn = root.querySelector('[data-hospitals-find]');
		const listEl = root.querySelector('[data-hospitals-list]');
		const statusEl = root.querySelector('[data-hospitals-status]');
		const radiusEl = root.querySelector('[data-hospitals-radius]');
		if (!findBtn || !listEl || !statusEl) return;

		findBtn.addEventListener('click', async () => {
			listEl.innerHTML = '';
			statusEl.textContent = 'Locating you…';
			statusEl.className = 'hospitals-status is-loading';
			statusEl.setAttribute('role', 'status');
			findBtn.disabled = true;

			const loc = await requestLocation();
			if (loc.error) {
				statusEl.textContent = loc.error;
				statusEl.className = 'hospitals-status is-error';
				findBtn.disabled = false;
				return;
			}

			const radiusM = radiusEl ? parseInt(radiusEl.value, 10) || 10000 : 10000;
			statusEl.textContent = 'Searching open map data for hospitals and clinics…';

			try {
				const res = await fetch(
					`/api/nearby-hospitals?lat=${encodeURIComponent(loc.lat)}&lng=${encodeURIComponent(loc.lng)}&radiusM=${encodeURIComponent(radiusM)}`
				);
				const data = await res.json();
				if (!res.ok) throw new Error(data.message || 'Lookup failed');

				const list = data.hospitals || [];
				if (list.length === 0) {
					statusEl.textContent = `No hospitals or clinics found within ${(data.radiusM || radiusM) / 1000} km. Try a larger radius.`;
					statusEl.className = 'hospitals-status is-warn';
				} else {
					statusEl.textContent = `Found ${list.length} nearby (within ${(data.radiusM || radiusM) / 1000} km). Phone and email come from community data and may be missing or outdated.`;
					statusEl.className = 'hospitals-status is-ok';
				}
				renderList(listEl, list);
			} catch (e) {
				statusEl.textContent = e.message || 'Could not reach the hospital directory.';
				statusEl.className = 'hospitals-status is-error';
			} finally {
				findBtn.disabled = false;
			}
		});
	}

	document.addEventListener('DOMContentLoaded', () => {
		document.querySelectorAll('[data-nearest-hospitals]').forEach(initPanel);
	});
})();
