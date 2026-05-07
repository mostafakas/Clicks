import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD07kWys5dp3f6FJeYblxMcAfQzY94MTtE",
    authDomain: "clicks-f7ce3.firebaseapp.com",
    projectId: "clicks-f7ce3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// استعادة الـ Scroll Position عند العودة للموقع
document.addEventListener('DOMContentLoaded', () => {
    const savedScroll = sessionStorage.getItem('scrollPosition');
    if (savedScroll && document.getElementById('storeContainer')) {
        setTimeout(() => window.scrollTo({ top: parseInt(savedScroll), behavior: 'auto' }), 100);
    }
});

// حفظ الـ Scroll Position قبل الخروج من الصفحة الرئيسية
window.addEventListener('scroll', () => {
    if(document.getElementById('storeContainer')) {
        sessionStorage.setItem('scrollPosition', window.scrollY);
    }
});

// إعدادات السلة العامة
window.updateCounters = () => {
    document.getElementById('cartCount').innerText = cart.reduce((sum, item) => sum + item.qty, 0);
};
window.updateCounters();

window.toggleCartModal = (show) => {
    const modal = document.getElementById('cartModal');
    if(modal) {
        modal.style.display = show ? 'flex' : 'none';
        if(show) window.renderCart();
    }
};

// منطق جلب وعرض المنتجات (في الرئيسية)
const storeContainer = document.getElementById('storeContainer');
if(storeContainer) {
    const productsRef = collection(db, "products");
    
    onSnapshot(query(productsRef, orderBy("createdAt", "desc")), (snapshot) => {
        allProducts = [];
        snapshot.forEach(doc => { allProducts.push({ id: doc.id, ...doc.data() }); });
        renderProducts(allProducts, 'all');
    });

    const renderProducts = (productsArray, filterType) => {
        storeContainer.innerHTML = '';
        if (productsArray.length === 0) {
            storeContainer.innerHTML = `<div style="text-align:center; padding: 50px; font-weight:700;">لا توجد منتجات.</div>`;
            return;
        }

        if (filterType === 'all') {
            const categories = [
                { id: 'Mobiles', name: 'موبايلات' },
                { id: 'Laptops', name: 'لابتوبات' },
                { id: 'PC', name: 'كمبيوتر' },
                { id: 'Accessories', name: 'إكسسوارات' },
                { id: 'Services', name: 'صيانة' }
            ];

            categories.forEach((cat, index) => {
                const catProducts = productsArray.filter(p => p.category === cat.id);
                if(catProducts.length > 0) {
                    storeContainer.innerHTML += buildHorizontalSection(cat.name, catProducts, index);
                }
            });
        } else {
            let catName = document.querySelector(`.cat-btn[data-filter="${filterType}"]`)?.innerText || 'البحث';
            storeContainer.innerHTML = `<div class="category-section"><div class="category-header"><h2 class="category-title">${catName}</h2></div><div class="products-grid">${buildCards(productsArray)}</div></div>`;
        }
    };

    const buildHorizontalSection = (title, products, index) => {
        return `
            <div class="category-section">
                <div class="category-header">
                    <h2 class="category-title">${title}</h2>
                    <div class="nav-arrows">
                        <button onclick="scrollRow('row-${index}', 1)"><i class="fas fa-chevron-right"></i></button>
                        <button onclick="scrollRow('row-${index}', -1)"><i class="fas fa-chevron-left"></i></button>
                    </div>
                </div>
                <div class="scroller-wrapper">
                    <div class="products-row" id="row-${index}">
                        ${buildCards(products)}
                    </div>
                </div>
            </div>`;
    };

    const buildCards = (products) => {
        let html = '';
        products.forEach(p => {
            let discountHtml = (p.oldPrice && p.oldPrice > p.price) ? `<div class="discount-badge">خصم ${Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)}%</div>` : '';
            html += `
                <div class="product-card">
                    <a href="product.html?id=${p.id}" class="product-img-wrapper">
                        ${discountHtml}
                        <img src="${p.image}" class="product-img" onerror="this.src='https://via.placeholder.com/250'">
                    </a>
                    <a href="product.html?id=${p.id}" class="product-info">
                        <h4 class="product-name">${p.name}</h4>
                        <div class="product-price">${p.price.toLocaleString()} ج.م</div>
                    </a>
                    <div class="card-controls">
                        <div class="qty-selector">
                            <button class="qty-btn" onclick="changeLocalQty(this, -1)">-</button>
                            <input type="number" class="qty-input" value="1" min="1" readonly>
                            <button class="qty-btn" onclick="changeLocalQty(this, 1)">+</button>
                        </div>
                        <button class="add-btn" onclick="addToCartAnimated(event, '${p.id}', '${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.image}')">
                            أضف <i class="fas fa-cart-plus"></i>
                        </button>
                    </div>
                </div>`;
        });
        return html;
    };

    window.scrollRow = (rowId, direction) => {
        const row = document.getElementById(rowId);
        // التمرير بناءً على اتجاه اللغة العربية (RTL)
        const scrollAmount = direction * 280; 
        row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };

    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            renderProducts(filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter), filter);
        });
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
        renderProducts(filtered, 'search');
    });
}

// التحكم في كمية المنتج قبل الإضافة
window.changeLocalQty = (btn, change) => {
    const input = btn.parentElement.querySelector('.qty-input');
    let val = parseInt(input.value) + change;
    if(val < 1) val = 1;
    input.value = val;
};

// أنيميشن طيران المنتج للسلة
window.addToCartAnimated = (event, id, name, price, image) => {
    // 1. قراءة الكمية المطلوبة من الـ input المجاور للزر
    const input = event.target.closest('.card-controls, .pd-controls').querySelector('.qty-input');
    const selectedQty = parseInt(input.value);

    // 2. إضافة للسلة برمجياً
    const existing = cart.find(i => i.id === id);
    if(existing) {
        existing.qty += selectedQty;
    } else {
        cart.push({ id, name, price, image, qty: selectedQty });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // 3. الأنيميشن
    const cartIcon = document.querySelector('.cart-btn');
    const imgElement = event.target.closest('.product-card, .product-page').querySelector('img');
    const flyItem = document.getElementById('flying-item');
    
    if (imgElement && flyItem && cartIcon) {
        const imgRect = imgElement.getBoundingClientRect();
        const cartRect = cartIcon.getBoundingClientRect();
        
        flyItem.src = image;
        flyItem.style.left = `${imgRect.left}px`;
        flyItem.style.top = `${imgRect.top}px`;
        flyItem.style.width = `${imgRect.width}px`;
        flyItem.style.height = `${imgRect.height}px`;
        
        flyItem.classList.add('flying');
        
        setTimeout(() => {
            flyItem.style.left = `${cartRect.left + 10}px`;
            flyItem.style.top = `${cartRect.top + 10}px`;
            flyItem.style.width = '20px';
            flyItem.style.height = '20px';
        }, 10);
        
        setTimeout(() => {
            flyItem.classList.remove('flying');
            flyItem.style.top = '-1000px';
            window.updateCounters();
            
            // إضافة تأثير نبض على أيقونة السلة
            cartIcon.style.transform = 'scale(1.2)';
            setTimeout(() => cartIcon.style.transform = 'scale(1)', 200);
            
            // إعادة الكمية لـ 1
            input.value = 1;
        }, 800);
    } else {
        window.updateCounters();
    }
};

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    window.updateCounters();
    window.renderCart();
};

window.renderCart = () => {
    const container = document.getElementById('cartItemsContainer');
    const totalDiv = document.getElementById('cartTotalDisplay');
    const form = document.getElementById('checkoutForm');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; font-weight:700; color:var(--text-light);">السلة فارغة</div>';
        totalDiv.style.display = 'none';
        form.style.display = 'none';
        return;
    }

    form.style.display = 'block';
    totalDiv.style.display = 'block';
    let html = ''; let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        html += `
            <div class="cart-item">
                <img src="${item.image}">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.qty} × ${item.price.toLocaleString()} = ${itemTotal.toLocaleString()} ج.م</div>
                </div>
                <button class="remove-btn" onclick="window.removeFromCart(${index})"><i class="fas fa-trash-alt"></i></button>
            </div>`;
        total += itemTotal;
    });
    
    container.innerHTML = html;
    totalDiv.innerHTML = `الإجمالي المطلــــوب: ${total.toLocaleString()} ج.م`;
};

// إرسال الطلب للموقع فقط (تم إزالة الواتساب)
window.sendOrderToWebsite = async () => {
    const data = {
        name: document.getElementById('custName').value,
        phone: document.getElementById('custPhone').value,
        delivery: document.getElementById('deliveryMethod').value,
        address: document.getElementById('custAddress').value,
        payment: document.getElementById('paymentMethod').value
    };
    
    if(!data.name || !data.phone || !data.address) return alert("برجاء إكمال كافة بيانات العميل.");

    const btn = document.getElementById('btnWebsiteOrder');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري التنفيذ...`;

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const orderData = { customer: data, items: cart, totalAmount: total, status: "جديد", createdAt: new Date() };

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert("🎉 تم استلام طلبك بنجاح! سنتواصل معك قريباً لتأكيد الشحن.");
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        window.updateCounters();
        window.toggleCartModal(false);
    } catch (error) {
        alert("حدث خطأ في الاتصال بالسيرفر. برجاء المحاولة لاحقاً.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-check-circle"></i> تأكيد الطلب`;
    }
};
