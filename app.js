(function () {
  "use strict";

  const STORAGE_KEY = "safety_flashcards_v1";
  const CATEGORIES = ["산업안전보건법", "산업안전일반", "기업진단지도"];

  let data = null;
  let currentCategory = null;

  const learningState = {
    items: [],
    index: 0,
    showTerm: false,
  };

  const homeScreen = document.getElementById("homeScreen");
  const categoryScreen = document.getElementById("categoryScreen");
  const categoryTitle = document.getElementById("categoryTitle");
  const backToHomeBtn = document.getElementById("backToHomeBtn");
  const openManageModalBtn = document.getElementById("openManageModalBtn");
  const termGrid = document.getElementById("termGrid");
  const emptyState = document.getElementById("emptyState");

  const learningOverlay = document.getElementById("learningOverlay");
  const learningOverlayBackdrop = learningOverlay.querySelector(
    "[data-learning-overlay-close]",
  );
  const learningImage = document.getElementById("learningImage");
  const learningTerm = document.getElementById("learningTerm");
  const learningCounter = document.getElementById("learningCounter");
  const prevCardBtn = document.getElementById("prevCardBtn");
  const nextCardBtn = document.getElementById("nextCardBtn");
  const toggleTermBtn = document.getElementById("toggleTermBtn");
  const closeLearningBtn = document.getElementById("closeLearningBtn");

  const manageModal = document.getElementById("manageModal");
  const manageModalBackdrop = manageModal.querySelector("[data-modal-close]");
  const closeManageModalBtn = document.getElementById("closeManageModalBtn");
  const addTermForm = document.getElementById("addTermForm");
  const termInput = document.getElementById("termInput");
  const imageInput = document.getElementById("imageInput");
  const manageList = document.getElementById("manageList");
  const manageCount = document.getElementById("manageCount");

  let lastFocusedBeforeModal = null;
  let isManageModalOpen = false;

  function initData() {
    const initial = {};
    CATEGORIES.forEach((cat) => {
      initial[cat] = [];
    });
    return initial;
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return initData();
      }
      const parsed = JSON.parse(raw);
      CATEGORIES.forEach((cat) => {
        if (!Array.isArray(parsed[cat])) {
          parsed[cat] = [];
        }
      });
      return parsed;
    } catch (e) {
      console.warn("로컬스토리지 데이터 파싱 실패, 초기화합니다.", e);
      return initData();
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("로컬스토리지 저장 실패", e);
      alert("저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요.");
    }
  }

  function showScreen(name) {
    if (name === "home") {
      homeScreen.classList.add("screen--active");
      categoryScreen.classList.remove("screen--active");
      categoryScreen.setAttribute("hidden", "true");
      homeScreen.removeAttribute("hidden");
    } else if (name === "category") {
      categoryScreen.classList.add("screen--active");
      homeScreen.classList.remove("screen--active");
      homeScreen.setAttribute("hidden", "true");
      categoryScreen.removeAttribute("hidden");
    }
  }

  function renderTermGrid() {
    if (!currentCategory) return;
    const items = data[currentCategory] || [];
    termGrid.innerHTML = "";

    if (items.length === 0) {
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;

    items.forEach((item, index) => {
      const cardBtn = document.createElement("button");
      cardBtn.type = "button";
      cardBtn.className = "term-card";
      cardBtn.setAttribute("role", "listitem");
      cardBtn.dataset.index = String(index);

      const thumb = document.createElement("div");
      thumb.className = "term-card__thumb";

      if (item.imageDataUrl) {
        const img = document.createElement("img");
        img.src = item.imageDataUrl;
        img.alt = item.term + " 이미지 미리보기";
        thumb.appendChild(img);
      }

      const label = document.createElement("div");
      label.className = "term-card__label";
      label.textContent = item.term;

      cardBtn.appendChild(thumb);
      cardBtn.appendChild(label);

      cardBtn.addEventListener("click", () => {
        openLearningOverlay(index);
      });

      termGrid.appendChild(cardBtn);
    });
  }

  function openCategory(category) {
    currentCategory = category;
    categoryTitle.textContent = category;
    showScreen("category");
    renderTermGrid();
  }

  function closeCategory() {
    currentCategory = null;
    showScreen("home");
    closeLearningOverlay();
  }

  function updateLearningControls() {
    const total = learningState.items.length;
    const idx = learningState.index;
    prevCardBtn.disabled = total === 0 || idx <= 0;
    nextCardBtn.disabled = total === 0 || idx >= total - 1;
    toggleTermBtn.disabled = total === 0;

    if (total === 0) {
      toggleTermBtn.textContent = "용어 보기";
    } else {
      toggleTermBtn.textContent = learningState.showTerm ? "용어 숨기기" : "용어 보기";
    }
  }

  function updateLearningCard() {
    const total = learningState.items.length;
    if (total === 0 || learningState.index < 0 || learningState.index >= total) {
      learningCounter.textContent = "0/0";
      learningTerm.textContent = "아직 용어가 없습니다. 관리에서 추가하세요.";
      learningImage.removeAttribute("src");
      learningImage.alt = "";
      updateLearningControls();
      return;
    }

    const item = learningState.items[learningState.index];
    learningCounter.textContent = String(learningState.index + 1) + "/" + String(total);

    if (item.imageDataUrl) {
      learningImage.src = item.imageDataUrl;
      learningImage.alt = item.term + " 이미지";
    } else {
      learningImage.removeAttribute("src");
      learningImage.alt = "";
    }

    learningTerm.textContent = learningState.showTerm ? item.term : "";

    updateLearningControls();
  }

  function openLearningOverlay(startIndex) {
    if (!currentCategory) return;
    const items = data[currentCategory] || [];
    learningState.items = items;
    if (!items.length) {
      learningState.index = 0;
      learningState.showTerm = false;
    } else {
      const safeIndex = typeof startIndex === "number" ? startIndex : 0;
      learningState.index = Math.min(Math.max(safeIndex, 0), items.length - 1);
      learningState.showTerm = false;
    }

    learningOverlay.classList.add("is-open");
    learningOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    updateLearningCard();

    if (toggleTermBtn) {
      toggleTermBtn.focus();
    }
  }

  function closeLearningOverlay() {
    if (!learningOverlay.classList.contains("is-open")) return;
    learningOverlay.classList.remove("is-open", "is-back");
    learningOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function nextCard() {
    if (learningState.index >= learningState.items.length - 1) return;
    learningState.index += 1;
    learningState.showTerm = false;
    updateLearningCard();
  }

  function prevCard() {
    if (learningState.index <= 0) return;
    learningState.index -= 1;
    learningState.showTerm = false;
    updateLearningCard();
  }

  function toggleTermVisibility() {
    if (!learningState.items.length) return;
    learningState.showTerm = !learningState.showTerm;
    updateLearningCard();
  }

  function openManageModal() {
    if (!currentCategory) return;
    if (isManageModalOpen) return;
    isManageModalOpen = true;

    lastFocusedBeforeModal = document.activeElement;

    manageModal.classList.add("is-open");
    manageModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    renderManageList();

    setTimeout(() => {
      const focusTarget = termInput || manageModal.querySelector("button, [href], input");
      if (focusTarget) {
        focusTarget.focus();
      }
    }, 0);
  }

  function closeManageModal() {
    if (!isManageModalOpen) return;
    isManageModalOpen = false;

    manageModal.classList.remove("is-open");
    manageModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
      lastFocusedBeforeModal.focus();
    }
  }

  function renderManageList() {
    if (!currentCategory) return;
    const items = data[currentCategory] || [];
    manageList.innerHTML = "";
    manageCount.textContent = String(items.length);

    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "등록된 카드가 없습니다.";
      li.style.fontSize = "0.85rem";
      li.style.color = "#9ca3af";
      manageList.appendChild(li);
      return;
    }

    items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "manage-item";

      const thumb = document.createElement("div");
      thumb.className = "manage-item__thumb";
      if (item.imageDataUrl) {
        const img = document.createElement("img");
        img.src = item.imageDataUrl;
        img.alt = item.term + " 이미지 썸네일";
        thumb.appendChild(img);
      }

      const label = document.createElement("div");
      label.className = "manage-item__label";
      label.textContent = item.term;

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "manage-item__delete";
      delBtn.textContent = "삭제";
      delBtn.addEventListener("click", () => {
        if (!currentCategory) return;
        const list = data[currentCategory] || [];
        const idx = list.findIndex((x) => x.id === item.id);
        if (idx !== -1) {
          list.splice(idx, 1);
          saveData();
          renderManageList();
          renderTermGrid();
        }
      });

      li.appendChild(thumb);
      li.appendChild(label);
      li.appendChild(delBtn);

      manageList.appendChild(li);
    });
  }

  function handleAddTermSubmit(event) {
    event.preventDefault();
    if (!currentCategory) return;

    const term = termInput.value.trim();
    const file = imageInput.files && imageInput.files[0];

    if (!term || !file) {
      alert("용어명과 이미지를 모두 선택해 주세요.");
      return;
    }

    const reader = new FileReader();
    const submitButton = addTermForm.querySelector("button[type='submit']");
    if (submitButton) submitButton.disabled = true;

    reader.onload = function (e) {
      const imageDataUrl = e.target && e.target.result ? String(e.target.result) : "";
      const entry = {
        id: String(Date.now()) + "-" + Math.random().toString(16).slice(2),
        term,
        imageDataUrl,
        createdAt: new Date().toISOString(),
      };

      data[currentCategory].push(entry);
      saveData();
      renderManageList();
      renderTermGrid();

      addTermForm.reset();
      termInput.focus();

      if (submitButton) submitButton.disabled = false;
    };

    reader.onerror = function () {
      alert("이미지 파일을 읽는 중 오류가 발생했습니다.");
      if (submitButton) submitButton.disabled = false;
    };

    reader.readAsDataURL(file);
  }

  function handleDocumentKeydown(event) {
    if (event.key === "Escape" || event.key === "Esc") {
      if (isManageModalOpen) {
        event.stopPropagation();
        event.preventDefault();
        closeManageModal();
        return;
      }
      if (learningOverlay.classList.contains("is-open")) {
        event.stopPropagation();
        event.preventDefault();
        closeLearningOverlay();
      }
    }

    if (event.key === "Tab" && isManageModalOpen) {
      trapFocusInModal(event, manageModal);
      return;
    }

    if (learningOverlay.classList.contains("is-open")) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextCard();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prevCard();
      }
    }
  }

  function trapFocusInModal(event, modalRoot) {
    const focusableSelectors =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.prototype.slice.call(
      modalRoot.querySelectorAll(focusableSelectors),
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const isShift = event.shiftKey;
    const activeElement = document.activeElement;

    if (!modalRoot.contains(activeElement)) {
      first.focus();
      event.preventDefault();
      return;
    }

    if (!isShift && activeElement === last) {
      first.focus();
      event.preventDefault();
    } else if (isShift && activeElement === first) {
      last.focus();
      event.preventDefault();
    }
  }

  function bindEvents() {
    const categoryButtons = homeScreen.querySelectorAll(".category-card");
    categoryButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const category = btn.getAttribute("data-category");
        if (category) {
          openCategory(category);
        }
      });
    });

    backToHomeBtn.addEventListener("click", () => {
      closeCategory();
    });

    openManageModalBtn.addEventListener("click", () => {
      openManageModal();
    });

    manageModalBackdrop.addEventListener("click", () => {
      closeManageModal();
    });

    closeManageModalBtn.addEventListener("click", () => {
      closeManageModal();
    });

    addTermForm.addEventListener("submit", handleAddTermSubmit);

    learningOverlayBackdrop.addEventListener("click", () => {
      closeLearningOverlay();
    });
    closeLearningBtn.addEventListener("click", () => {
      closeLearningOverlay();
    });
    prevCardBtn.addEventListener("click", prevCard);
    nextCardBtn.addEventListener("click", nextCard);
    toggleTermBtn.addEventListener("click", toggleTermVisibility);

    document.addEventListener("keydown", handleDocumentKeydown);
  }

  function init() {
    data = loadData();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

