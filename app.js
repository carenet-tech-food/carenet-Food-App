// Initialize Supabase Client (guarded against re-declaration)
if (typeof supabaseClient === 'undefined') {
  var SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
  var SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
  var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Switch Tabs
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  if (tabName === 'form') {
    document.getElementById('tab-form-btn').classList.add('active');
    document.getElementById('food-relief-form-tab').classList.add('active');
  } else {
    document.getElementById('tab-table-btn').classList.add('active');
    document.getElementById('food-relief-table-tab').classList.add('active');
    loadRecentVisits();
  }
}

// Live Search Families as text is typed
async function searchFamilies(query) {
  const list = document.getElementById('search-results');
  if (!list) return;
  list.innerHTML = '';
  
  const trimmed = query.trim();
  if (trimmed.length < 1) return;

  console.log('Initiating search for:', trimmed);

  const filter = [
    `FamilyName.ilike.%${trimmed}%`,
    `PrimaryFirstName.ilike.%${trimmed}%`,
    `PreferredName.ilike.%${trimmed}%`,
    `Phone.ilike.%${trimmed}%`,
    `Email.ilike.%${trimmed}%`
  ].join(',');

  const { data, error } = await supabaseClient
    .from('families')
    .select('FamilyID, FamilyName, PrimaryFirstName, PreferredName, Phone, Email, Suburb, Address')
    .or(filter)
    .limit(8);

  if (error) {
    console.error('Supabase Search Error:', error);
    const li = document.createElement('li');
    li.textContent = 'Database error: ' + error.message;
    li.style.color = '#DC2626';
    li.style.padding = '0.65rem 0.85rem';
    list.appendChild(li);
    return;
  }

  console.log('Returned rows:', data);

  if (!data || data.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No matching family found.';
    li.style.color = '#6B7280';
    li.style.padding = '0.65rem 0.85rem';
    li.style.cursor = 'default';
    list.appendChild(li);
    return;
  }

  data.forEach(fam => {
    const li = document.createElement('li');
    const firstName = fam.PrimaryFirstName || fam.PreferredName || '';
    const lastName = fam.FamilyName ? ` ${fam.FamilyName}` : '';
    const suburb = fam.Suburb ? ` — ${fam.Suburb}` : '';
    const phone = fam.Phone ? ` (${fam.Phone})` : '';

    li.textContent = `${firstName}${lastName}${suburb}${phone}`;
    li.style.padding = '0.65rem 0.85rem';
    li.style.cursor = 'pointer';
    li.onclick = () => selectFamily(fam);
    list.appendChild(li);
  });
}

function selectFamily(fam) {
  document.getElementById('selected_family_id').value = fam.FamilyID;
  document.getElementById('first_name').value = fam.PrimaryFirstName || fam.PreferredName || '';
  document.getElementById('last_name').value = fam.FamilyName || '';
  document.getElementById('phone').value = fam.Phone || '';
  document.getElementById('email').value = fam.Email || '';
  document.getElementById('address').value = fam.Address || '';
  document.getElementById('suburb').value = fam.Suburb || '';
  
  document.getElementById('client_search').value = `${fam.PrimaryFirstName || ''} ${fam.FamilyName || ''}`.trim();
  document.getElementById('search-results').innerHTML = '';
}

// Handle Service Visit Submission
async function handleFormSubmit(e) {
  e.preventDefault();
  let familyId = document.getElementById('selected_family_id').value;

  if (!familyId) {
    const newFamilyID = 'CN-' + Date.now().toString().slice(-6);
    const { data: newFam, error: famErr } = await supabaseClient
      .from('families')
      .insert([{
        FamilyID: newFamilyID,
        PrimaryFirstName: document.getElementById('first_name').value,
        FamilyName: document.getElementById('last_name').value,
        Phone: document.getElementById('phone').value,
        Email: document.getElementById('email').value,
        Address: document.getElementById('address').value,
        Suburb: document.getElementById('suburb').value,
        Postcode: parseFloat(document.getElementById('postcode').value) || null,
        Status: document.getElementById('status').value,
        CreatedBy: 'volunteer@carenet.org.au'
      }])
      .select();

    if (famErr) {
      alert('Error creating new family profile: ' + famErr.message);
      return;
    }
    familyId = newFamilyID;
  }

  const visitID = 'SV-' + Date.now().toString().slice(-6);
  const { error: visitErr } = await supabaseClient
    .from('service_visits')
    .insert([{
      VisitID: visitID,
      FamilyID: familyId,
      LocationID: document.getElementById('collection_center').value,
      Bags: parseInt(document.getElementById('bags').value) || 1,
      Adults60Plus: parseInt(document.getElementById('adults_60_plus').value) || 0,
      Adults50_59: parseInt(document.getElementById('adults_50_59').value) || 0,
      Adults35_49: parseInt(document.getElementById('adults_35_49').value) || 0,
      Adults25_34: parseInt(document.getElementById('adults_25_34').value) || 0,
      Youth12_24: parseInt(document.getElementById('youth_12_24').value) || 0,
      Children0_12: parseInt(document.getElementById('children_0_12').value) || 0,
      Notes: document.getElementById('notes').value,
      RecordedBy: 'volunteer@carenet.org.au',
      MigrationSource: 'CareNet Web App'
    }]);

  if (visitErr) {
    alert('Error recording service visit: ' + visitErr.message);
  } else {
    alert('Service visit recorded successfully!');
    resetForm();
  }
}

function resetForm() {
  document.getElementById('foodReliefForm').reset();
  document.getElementById('selected_family_id').value = '';
  document.getElementById('search-results').innerHTML = '';
}

// Fetch and render Table
async function loadRecentVisits() {
  const tbody = document.getElementById('visitsTableBody');
  tbody.innerHTML = '<tr><td colspan="7">Loading recent visits...</td></tr>';

  const { data, error } = await supabaseClient
    .from('service_visits')
    .select('ServiceDateTime, Bags, RecordedBy, LocationID, families(FamilyName, PrimaryFirstName, Suburb)')
    .order('ServiceDateTime', { ascending: false })
    .limit(25);

  if (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:red">Error loading visits: ${error.message}</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  data.forEach(v => {
    const row = document.createElement('tr');
    const fam = v.families || {};
    row.innerHTML = `
      <td>${new Date(v.ServiceDateTime).toLocaleDateString('en-AU')}</td>
      <td>${fam.FamilyName || '-'}</td>
      <td>${fam.PrimaryFirstName || '-'}</td>
      <td>${fam.Suburb || '-'}</td>
      <td>${v.Bags}</td>
      <td>${v.LocationID}</td>
      <td>${v.RecordedBy || '-'}</td>
    `;
    tbody.appendChild(row);
  });
}