// Live Search Families as text is typed (FamilyName, PrimaryFirstName, PreferredName, Phone, Email)
async function searchFamilies(query) {
  const list = document.getElementById('search-results');
  list.innerHTML = '';
  const trimmed = query.trim();
  
  if (trimmed.length < 1) return;

  // Simplified and bulletproof PostgREST OR filter for Supabase
  const filter = [
    `FamilyName.ilike.%${trimmed}%`,
    `PrimaryFirstName.ilike.%${trimmed}%`,
    `PreferredName.ilike.%${trimmed}%`,
    `Phone.ilike.%${trimmed}%`,
    `Email.ilike.%${trimmed}%`
  ].join(',');

  const { data, error } = await supabase
    .from('families')
    .select('FamilyID, FamilyName, PrimaryFirstName, PreferredName, Phone, Email, Suburb, Address')
    .or(filter)
    .limit(8);

  if (error) {
    console.error('Supabase Search Error:', error);
    return;
  }

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
    li.onclick = () => selectFamily(fam);
    list.appendChild(li);
  });
}