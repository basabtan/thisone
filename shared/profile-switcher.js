(function initProfileSwitcher() {
  var script = document.currentScript;
  if (!script) return;

  var title = script.dataset.profileTitle || "Profile";
  var siblingHref = script.dataset.siblingHref || "";
  var siblingLabel = script.dataset.siblingLabel || "Other profile";
  var homeHref = script.dataset.homeHref || "../index.html";

  var bar = document.createElement("nav");
  bar.className = "profile-switcher";
  bar.setAttribute("aria-label", "Profile navigation");

  var home = document.createElement("a");
  home.className = "profile-switcher-home";
  home.href = homeHref;
  home.textContent = "\u2190 Home";

  var mid = document.createElement("span");
  mid.className = "profile-switcher-title";
  mid.textContent = title;

  bar.appendChild(home);
  bar.appendChild(mid);

  if (siblingHref) {
    var sib = document.createElement("a");
    sib.className = "profile-switcher-sibling";
    sib.href = siblingHref;
    sib.textContent = siblingLabel + " \u2192";
    bar.appendChild(sib);
  }

  document.body.classList.add("has-profile-switcher");
  document.body.insertBefore(bar, document.body.firstChild);
})();
