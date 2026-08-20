$(() => {
    class EthioBizProductListing {
        constructor() {
            let me = this;
            let is_item_group_page = $(".item-group-content").data("item-group");
            this.item_group = is_item_group_page || null;

            let view_type = localStorage.getItem("product_view") || "Grid View";

            // Initialize standard product view
            if (window.webshop && window.webshop.ProductView) {
                new webshop.ProductView({
                    view_type: view_type === "Map View" ? "Grid View" : view_type,
                    products_section: $('#product-listing'),
                    item_group: me.item_group
                });
            }

            this.bind_card_actions();
            this.setup_icon_view_toggler(view_type);
            this.inject_company_filter_bar();
        }

        bind_card_actions() {
            if (window.webshop && window.webshop.webshop) {
                if (webshop.webshop.shopping_cart) webshop.webshop.shopping_cart.bind_add_to_cart_action();
                if (webshop.webshop.wishlist) webshop.webshop.wishlist.bind_wishlist_action();
            }
        }

        inject_company_filter_bar() {
            let timer = setInterval(() => {
                let $filterSection = $(".filters-section");
                if ($filterSection.length && !$("#ethiobiz-company-filter-widget").length) {
                    clearInterval(timer);

                    // Fetch active company locations to populate company filter
                    fetch('/api/method/bismillah_ethiobiz.company_map_api.get_company_locations')
                        .then(r => r.json())
                        .then(res => {
                            const companies = (res.message && res.message.companies) ? res.message.companies : [];
                            if (!companies.length) return;

                            let companyOpts = '<option value="all">🏢 All Companies / Merchants</option>';
                            companies.forEach(c => {
                                companyOpts += `<option value="${c.name}">${c.name}</option>`;
                            });

                            $filterSection.prepend(`
                                <div id="ethiobiz-company-filter-widget" class="mb-4 pb-3 border-bottom">
                                    <label class="font-weight-bold text-dark mb-2" style="font-size: 13px;">🏢 Filter by Company:</label>
                                    <select id="select-company-filter" class="form-select form-select-sm rounded-pill px-3 shadow-sm border" style="font-size: 12px; font-weight: 600;">
                                        ${companyOpts}
                                    </select>
                                </div>
                            `);

                            $("#select-company-filter").on("change", function() {
                                const selected = $(this).val();
                                if (selected === "all") {
                                    $(".item-card").show();
                                } else {
                                    $(".item-card").each(function() {
                                        const cardText = $(this).text();
                                        if (cardText.includes(selected)) {
                                            $(this).show();
                                        } else {
                                            $(this).hide();
                                        }
                                    });
                                }
                            });
                        });
                }
            }, 100);

            setTimeout(() => clearInterval(timer), 4000);
        }

        setup_icon_view_toggler(initial_view) {
            let me = this;
            let timer = setInterval(() => {
                let $toolbar = $(".toolbar");
                if ($toolbar.length) {
                    clearInterval(timer);

                    // Restyle toolbar for clean right-alignment
                    $toolbar.addClass("d-flex justify-content-between align-items-center mb-4");

                    // Replace or inject right-aligned icon-only toggler
                    $(".toggle-container").remove();
                    $toolbar.append(`
                        <div class="toggle-container d-flex justify-content-end align-items-center ms-auto" style="margin-left: auto;">
                            <div class="btn-group shadow-sm" role="group" aria-label="View Toggler" style="background: #f8fafc; padding: 4px; border-radius: 25px; border: 1px solid #cbd5e1;">
                                <button type="button" id="btn-icon-grid" class="btn btn-sm btn-view-icon ${initial_view === 'Grid View' ? 'active-view' : ''}" title="Grid View" style="border-radius: 20px; width: 40px; height: 36px; border: none; font-size: 17px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
                                    <span>⊞</span>
                                </button>
                                <button type="button" id="btn-icon-list" class="btn btn-sm btn-view-icon ${initial_view === 'List View' ? 'active-view' : ''}" title="List View" style="border-radius: 20px; width: 40px; height: 36px; border: none; font-size: 17px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
                                    <span>☰</span>
                                </button>
                                <button type="button" id="btn-icon-map" class="btn btn-sm btn-view-icon ${initial_view === 'Map View' ? 'active-view' : ''}" title="Map View" style="border-radius: 20px; width: 40px; height: 36px; border: none; font-size: 17px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
                                    <span>🗺️</span>
                                </button>
                            </div>
                        </div>
                    `);

                    if (!document.getElementById('ethiobiz-view-style')) {
                        const style = document.createElement('style');
                        style.id = 'ethiobiz-view-style';
                        style.innerHTML = `
                            .btn-view-icon {
                                background: transparent;
                                color: #64748b;
                            }
                            .btn-view-icon:hover {
                                color: #008080;
                                background: #e2e8f0;
                            }
                            .btn-view-icon.active-view {
                                background: #008080 !important;
                                color: #ffffff !important;
                                box-shadow: 0 2px 10px rgba(0,128,128,0.35);
                            }
                            #all-products-leaflet-map {
                                width: 100% !important;
                                height: 80vh !important;
                                min-height: 560px !important;
                                border-radius: 20px;
                            }
                            .leaflet-container {
                                width: 100% !important;
                                height: 100% !important;
                            }
                        `;
                        document.head.appendChild(style);
                    }

                    me.bind_view_events();

                    if (initial_view === "Map View") {
                        setTimeout(() => { $("#btn-icon-map").trigger("click"); }, 150);
                    }
                }
            }, 50);

            setTimeout(() => clearInterval(timer), 3500);
        }

        bind_view_events() {
            let me = this;

            $("#btn-icon-grid").on("click", function(e) {
                e.preventDefault();
                $(".btn-view-icon").removeClass("active-view");
                $(this).addClass("active-view");

                $("#products-list-area").addClass("hidden");
                $("#products-map-area").hide();
                $("#products-grid-area").removeClass("hidden").show();
                $(".product-paging-area").show();
                localStorage.setItem("product_view", "Grid View");
            });

            $("#btn-icon-list").on("click", function(e) {
                e.preventDefault();
                $(".btn-view-icon").removeClass("active-view");
                $(this).addClass("active-view");

                $("#products-grid-area").addClass("hidden");
                $("#products-map-area").hide();
                $("#products-list-area").removeClass("hidden").show();
                $(".product-paging-area").show();
                localStorage.setItem("product_view", "List View");
            });

            $("#btn-icon-map").on("click", function(e) {
                e.preventDefault();
                $(".btn-view-icon").removeClass("active-view");
                $(this).addClass("active-view");

                $("#products-grid-area, #products-list-area").addClass("hidden").hide();
                $(".product-paging-area").hide();
                me.render_fullscreen_map();
                localStorage.setItem("product_view", "Map View");
            });
        }

        render_fullscreen_map() {
            let me = this;
            let $listing = $('#product-listing');

            if (!$("#products-map-area").length) {
                $listing.append(`
                    <div id="products-map-area" style="width: 100%; margin-top: 10px;">
                        <div class="card p-0 shadow-sm border-0 mb-4" style="border-radius: 24px; overflow: hidden; position: relative; border: 1px solid #cbd5e1; background: #ffffff;">
                            <!-- Floating Header Overlay -->
                            <div style="position: absolute; top: 18px; left: 50%; transform: translateX(-50%); z-index: 1000; background: rgba(255,255,255,0.96); backdrop-filter: blur(14px); padding: 8px 22px; border-radius: 35px; box-shadow: 0 6px 28px rgba(0,0,0,0.18); display: flex; gap: 14px; align-items: center; border: 1px solid rgba(255,255,255,0.9);">
                                <span style="font-weight: 800; font-size: 13px; color: #0f172a;">🗺️ Verified Business & Product Map</span>
                                <a href="/map" class="btn btn-xs btn-outline-dark rounded-pill px-3 py-1 font-weight-bold" style="font-size: 11px;">Fullscreen Map &rarr;</a>
                            </div>
                            <div id="all-products-leaflet-map"></div>
                        </div>
                    </div>
                `);
            } else {
                $("#products-map-area").show();
            }

            this.init_map_instance();
        }

        init_map_instance() {
            let me = this;
            if (!window.L) {
                if (!document.getElementById('leaflet-css-bundle')) {
                    let link = document.createElement("link");
                    link.id = 'leaflet-css-bundle';
                    link.rel = "stylesheet";
                    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                    document.head.appendChild(link);
                }

                let script = document.createElement("script");
                script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
                script.onload = () => { me.init_map_instance(); };
                document.head.appendChild(script);
                return;
            }

            const mapElem = document.getElementById('all-products-leaflet-map');
            if (!mapElem) return;

            if (this.mapInstance) {
                setTimeout(() => { this.mapInstance.invalidateSize(true); }, 50);
                setTimeout(() => { this.mapInstance.invalidateSize(true); }, 250);
                setTimeout(() => { this.mapInstance.invalidateSize(true); }, 600);
                return;
            }

            const map = L.map('all-products-leaflet-map').setView([9.0108, 38.7617], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors | EthioBiz.et',
                maxZoom: 19
            }).addTo(map);

            this.mapInstance = map;

            setTimeout(() => { map.invalidateSize(true); }, 100);
            setTimeout(() => { map.invalidateSize(true); }, 350);
            setTimeout(() => { map.invalidateSize(true); }, 700);

            window.addEventListener('resize', () => { map.invalidateSize(true); });

            fetch('/api/method/bismillah_ethiobiz.company_map_api.get_company_locations')
                .then(r => r.json())
                .then(res => {
                    const companies = res.message ? res.message.companies : [];
                    companies.forEach(c => {
                        const marker = L.marker([c.lat, c.lng]).addTo(map);
                        marker.bindPopup(`
                            <div style="font-family: inherit; min-width: 200px; padding: 6px;">
                                <h6 style="margin: 0 0 4px 0; font-weight: 700; font-size: 15px; color: #0f172a;">${c.name}</h6>
                                <span style="font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 10px; font-weight: 600;">${c.category}</span>
                                <div style="font-size: 12px; color: #64748b; margin-top: 6px;">📍 ${c.address || 'Addis Ababa'}</div>
                                <a href="${c.shop_url}" style="display: block; margin-top: 10px; background: #008080; color: white; text-align: center; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; text-decoration: none;">View Store Catalog &rarr;</a>
                            </div>
                        `);
                    });
                })
                .catch(e => console.error(e));
        }
    }

    new EthioBizProductListing();
});
