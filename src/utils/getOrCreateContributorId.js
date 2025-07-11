export function getOrCreateContributorId() {
  let id = localStorage.getItem("trill_contributor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("trill_contributor_id", id);
  }
  return id;
}
