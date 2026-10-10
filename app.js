// Live Search Families as text is typed
async function searchFamilies(query) {
  const list = document.getElementById('search-results');
  if (!list) return;
  list.innerHTML = '';
  
  const trimmed = query.trim();
  if (trimmed.length < 1) return;

  console.log('Initiating search for:', trimmed);

  // Perform multi-column search
  const { data, error } = await supabase
    .from('families')
    .select('FamilyID, FamilyName, PrimaryFirstName, PreferredName, Phone, Email, Suburb, Address')
    .or(`PrimaryFirstName.ilike.%${trimmed}%,FamilyName.ilike.%${trimmed}%,PreferredName.ilike.%${trimmed}%,Phone.ilike.%${trimmed}%,Email.ilike.%${trimmed}%`)
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