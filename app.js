import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// إعدادات Firebase الخاصة بك
const firebaseConfig = {
    apiKey: "AIzaSyD07kWys5dp3f6FJeYblxMcAfQzY94MTtE",
    authDomain: "clicks-f7ce3.firebaseapp.com",
    projectId: "clicks-f7ce3",
    storageBucket: "clicks-f7ce3.firebasestorage.app",
    messagingSenderId: "628318172493",
    appId: "1:628318172493:web:e5437bde78399b6fbaf304"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// المتغيرات العامة
let allProducts = []; 
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const categoryNames = {
    'Laptops': 'لابتوبات', 'Mobiles': 'موبايلات', 'PC': 'كمبيوترات و PC', 
    'Accessories': 'إكسسوارات وقطع غيار', 'Services': 'صيانة'
};

// 1. تحديث عدادات السلة
window.updateCounters = () => {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cartCount');
    badge.innerText = totalItems;
    
    // أنيميشن عند تحديث السلة
    badge.style.transform = 'scale(1.5)';
    setTimeout(() => badge.style.transform = 'scale(1)', 200);
};
updateCounters();

// 2. تحميل جميع المنتجات وعرضها (لتوفير سرعة خارقة في التصفح)
async function fetchAndBuildStore() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        querySnapshot.forEach((doc) => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });
        
        // ترتيب المنتجات من الأحدث للأقدم
        allProducts.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        
        document.getElementById('loadingState').style.display = 'none';
        buildStoreDOM();
    } catch (error) {
        console.error("Error fetching products: ", error);
        document.getElementById('loadingState').innerHTML = `<h3 style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i> حدث خطأ في الاتصال بقاعدة البيانات. يرجى المحاولة لاحقاً.</h3>`;
    }
}

// 3. بناء هيكل المنتجات في الصفحة الرئيسية
function buildStoreDOM() {
    const container = document.getElementById('storeContent');
    container.innerHTML = '';
    
    Object.keys(categoryNames).forEach(cat => {
        const catProducts = allProducts.filter(p => p.category === cat);
        if(catProducts.length === 0) return;

        let cardsHtml = catProducts.map(p => `
            <div class="product-card" onclick="openProductDetails('${p.id}')">
                <div class="product-img-container">
                    <img src="${p.image}" loading="lazy" class="product-img" onerror="this.src='https://via.placeholder.com/250'">
                </div>
                <div class="product-brand">${p.brand || 'Clicks'}</div>
                <h4 class="product-title">${p.name}</h4>
                <div class="product-price">
                    <span class="current-price">${p.price.toLocaleString()} ج.م</span>
                </div>
                <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCartSilent('${p.id}')">
                    <i class="fas fa-cart-plus"></i> أضف للسلة
                </button>
            </div>
        `).join('');

        let html = `
        <div class="category-row" data-category="${cat}">
            <div class="category-header"><h3>${categoryNames[cat]}</h3></div>
            <div class="slider-container" id="container-${cat}">
                <button class="scroll-btn right" onclick="document.getElementById('track-${cat}').scrollBy({left: 350, behavior: 'smooth'})"><i class="fas fa-chevron-right"></i></button>
                <div class="slider-track" id="track-${cat}">
                    ${cardsHtml}
                </div>
                <button class="scroll-btn left" onclick="document.getElementById('track-${cat}').scrollBy({left: -350, behavior: 'smooth'})"><i class="fas fa-chevron-left"></i></button>
            </div>
        </div>`;
        container.innerHTML += html;
    });
}

// 4. نظام البحث المباشر (Live Search) - تم إصلاحه ليعمل بامتياز
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('.category-row');
    let hasAnyVisible = false;

    // إعادة تعيين أزرار التصنيفات إلى "الكل" عند البحث
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-filter="all"]').classList.add('active');

    rows.forEach(row => {
        const track = row.querySelector('.slider-track');
        const cards = row.querySelectorAll('.product-card');
        let hasVisibleInRow = false;

        cards.forEach(card => {
            const title = card.querySelector('.product-title').innerText.toLowerCase();
            const brand = card.querySelector('.product-brand').innerText.toLowerCase();
            
            if (term === "" || title.includes(term) || brand.includes(term)) {
                card.style.display = 'flex';
                hasVisibleInRow = true;
                hasAnyVisible = true;
            } else {
                card.style.display = 'none';
            }
        });

        if (hasVisibleInRow) {
            row.style.display = 'block';
            // إذا كان هناك بحث، نجعل العرض شبكي (Grid) بدلاً من متمرر (Slider)
            if (term !== "") {
                track.classList.add('grid-view');
                row.querySelector('.slider-container').classList.add('grid-view-active');
            } else {
                track.classList.remove('grid-view');
                row.querySelector('.slider-container').classList.remove('grid-view-active');
            }
        } else {
            row.style.display = 'none';
        }
    });

    // إظهار رسالة عدم وجود نتائج إن لزم الأمر
    document.getElementById('noResults').style.display = hasAnyVisible || term === "" ? 'none' : 'block';
});

// 5. التنقل بين الأقسام
document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // تفريغ حقل البحث عند تغيير القسم
        document.getElementById('searchInput').value = "";
        document.getElementById('noResults').style.display = 'none';
        
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.getAttribute('data-filter');
        document.querySelectorAll('.category-row').forEach(row => {
            // إظهار الكروت التي ربما أُخفيت بسبب البحث
            row.querySelectorAll('.product-card').forEach(c => c.style.display = 'flex');

            if (filter === 'all' || row.dataset.category === filter) {
                row.style.display = 'block';
                const track = row.querySelector('.slider-track');
                const container = row.querySelector('.slider-container');
                if(filter === 'all') {
                    track.classList.remove('grid-view');
                    container.classList.remove('grid-view-active');
                } else {
                    track.classList.add('grid-view');
                    container.classList.add('grid-view-active');
                }
            } else {
                row.style.display = 'none';
            }
        });
    });
});

// 6. الإضافة المباشرة للسلة بصمت (بدون فتح نافذة) مع إشعار
window.addToCartSilent = (id) => {
    const p = allProducts.find(item => item.id === id);
    if(!p) return;

    let existingItem = cart.find(item => item.id === id);
    if(existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, qty: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCounters();
    
    // إظهار إشعار الإضافة (Toast)
    showToast(`تمت إضافة "${p.name}" إلى السلة بنجاح 🛒`, 'success');
};

// نظام الإشعارات المنبثقة
window.showToast = (message, type = 'success') => {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    toast.innerHTML = `<i class="fas fa-check-circle"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    // إزالة الإشعار بعد انتهاء الأنيميشن (3 ثواني)
    setTimeout(() => {
        if(container.contains(toast)) {
            container.removeChild(toast);
        }
    }, 3000);
};

// 7. فتح تفاصيل المنتج (التصميم الاحترافي الجديد)
window.openProductDetails = (id) => {
    const p = allProducts.find(item => item.id === id);
    if(!p) return;
    
    document.getElementById('detailsContainer').innerHTML = `
        <div class="details-img-col">
            <img src="${p.image}" onerror="this.src='https://via.placeholder.com/400'">
        </div>
        <div class="details-info-col">
            <div class="details-brand"><i class="fas fa-tag"></i> ${p.brand || 'Clicks'}</div>
            <h2 class="details-title">${p.name}</h2>
            
            <div class="details-price-box">
                <div style="font-size:14px; font-weight:800; color:var(--text-muted); margin-bottom:5px;">سعر المنتج:</div>
                <span>${p.price.toLocaleString()} ج.م</span>
            </div>
            
            <p class="details-desc">${p.description || 'هذا المنتج يتميز بجودة عالية وضمان الوكيل. اطلبه الآن ليصلك أينما كنت.'}</p>
            
            <button class="btn-large-add" onclick="addToCartSilent('${p.id}'); closeDetailsModal();">
                <i class="fas fa-cart-arrow-down"></i> أضف إلى السلة الآن
            </button>
        </div>`;
        
    document.getElementById('productDetailsModal').style.display = 'flex';
};

window.closeDetailsModal = () => {
    document.getElementById('productDetailsModal').style.display = 'none';
};

// 8. التعامل مع السلة وتحديث الكميات
window.updateCartQty = (id, change) => {
    let item = cart.find(i => i.id === id);
    if(item) {
        item.qty += change;
        if(item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCounters();
    renderCart();
};

window.toggleCartModal = (show) => {
    document.getElementById('cartModal').style.display = show ? 'flex' : 'none';
    if(show) renderCart();
};

window.renderCart = () => {
    const container = document.getElementById('cartItemsContainer');
    const totalDiv = document.getElementById('cartTotalDisplay');
    const form = document.getElementById('checkoutForm');
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
                <i class="fas fa-shopping-cart fa-4x" style="margin-bottom:20px; color:#cbd5e1;"></i>
                <h3 style="font-weight:900; font-size:22px;">سلة المشتريات فارغة</h3>
                <p style="margin-top:10px; font-weight:600;">تصفح منتجاتنا وأضف ما يعجبك هنا!</p>
            </div>`;
        totalDiv.style.display = 'none';
        form.style.display = 'none';
        return;
    }

    form.style.display = 'block';
    totalDiv.style.display = 'block';
    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        html += `
            <div class="cart-item">
                <img src="${item.image}" class="cart-item-img">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} ج.م</div>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)"><i class="fas fa-plus"></i></button>
                    <span class="qty-display">${item.qty}</span>
                    <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)"><i class="fas fa-minus"></i></button>
                </div>
            </div>`;
        total += (item.price * item.qty);
    });
    
    container.innerHTML = html;
    totalDiv.innerHTML = `
        <div class="cart-total-text">الإجمالي المطلوب للدفع:</div>
        <div class="cart-total-val">${total.toLocaleString()} ج.م</div>
        <div style="font-size:13px; font-weight:700; color:#166534; margin-top:10px;"><i class="fas fa-info-circle"></i> السعر لا يشمل مصاريف الشحن إن وجدت</div>
    `;
};

// 9. تأكيد الطلب إلكترونياً
window.sendOrderToWebsite = async () => {
    const data = {
        name: document.getElementById('custName').value,
        phone: document.getElementById('custPhone').value,
        delivery: document.getElementById('deliveryMethod').value,
        address: document.getElementById('custAddress').value,
        payment: document.getElementById('paymentMethod').value
    };
    
    if(!data.name || !data.phone || !data.address) {
        alert("برجاء إكمال كافة بيانات التواصل والتوصيل بشكل صحيح.");
        return;
    }

    const btn = document.getElementById('btnWebsiteOrder');
    btn.disabled = true; 
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري تأكيد الطلب...`;

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const orderData = { 
        customer: data, 
        items: cart, 
        totalAmount: total, 
        status: "جديد", 
        createdAt: new Date() 
    };

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert("🎉 مبروك! تم استلام وتأكيد طلبك بنجاح. سيقوم فريقنا بالتواصل معك قريباً لتأكيد الشحن.");
        // تفريغ السلة بعد نجاح الطلب
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCounters();
        toggleCartModal(false);
    } catch (error) { 
        console.error("Order error: ", error);
        alert("حدث خطأ في الشبكة، برجاء المحاولة مرة أخرى."); 
    } finally { 
        btn.disabled = false; 
        btn.innerHTML = `<i class="fas fa-check-circle"></i> تأكيد الطلب إلكترونياً`; 
    }
};

// إغلاق النوافذ عند الضغط على زر ESC
document.addEventListener('keydown', (e) => { 
    if (e.key === 'Escape') { 
        closeDetailsModal(); 
        toggleCartModal(false); 
    } 
});

// بدء التشغيل
fetchAndBuildStore();
