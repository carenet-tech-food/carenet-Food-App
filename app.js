// Initialize Supabase Client
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_PUBLISHABLE_KEY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Search Families for Autocomplete
async function searchFamilies(query) {
  const list = document.getElementById('search-results');
  list.innerHTML = '';
  if (query.trim().length < 2) return;

  const { data, error } = await supabase
    .from('families')
    .select('FamilyID, FamilyName, PrimaryFirstName, Phone, Suburb')
    .or(`PrimaryFirstName.ilike.%${query}%,FamilyName.ilike.%${query}%,Phone.ilike.%${query}%`)
    .limit(5);

  if (error || !data) return;

  data.forEach(fam => {
    const li = document.createElement('li');
    li.textContent = `${fam.PrimaryFirstName} ${fam.FamilyName || ''} — ${fam.Suburb || ''} (${fam.Phone || 'No Phone'})`;
    li.onclick = () => selectFamily(fam);
    list.appendChild(li);
  });
}

function selectFamily(fam) {
  document.getElementById('selected_family_id').value = fam.FamilyID;
  document.getElementById('first_name').value = fam.PrimaryFirstName;
  document.getElementById('last_name').value = fam.FamilyName || '';
  document.getElementById('phone').value = fam.Phone || '';
  document.getElementById('suburb').value = fam.Suburb || '';
  document.getElementById('search-results').innerHTML = '';
}

// Handle Service Visit Submission
async function handleFormSubmit(e) {
  e.preventDefault();
  let familyId = document.getElementById('selected_family_id').value;

  // 1. If new family, insert into 'families' table first
  if (!familyId) {
    const newFamilyID = 'CN-' + Date.now().toString().slice(-6);
    const { data: newFam, error: famErr } = await supabase
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

  // 2. Insert Service Visit
  const visitID = 'SV-' + Date.now().toString().slice(-6);
  const { error: visitErr } = await supabase
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

  const { data, error } = await supabase
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
