// WebShop ProductView with Grid View, List View, and Map View Support
webshop.ProductView = class {
	/* Options:
		- View Type
		- Products Section Wrapper,
		- Item Group: If its an Item Group page
	*/
	constructor(options) {
		Object.assign(this, options);
		this.preference = this.view_type || localStorage.getItem("product_view") || "List View";
		this.make();
	}

	make(from_filters=false) {
		this.products_section.empty();
		this.prepare_toolbar();
		this.get_item_filter_data(from_filters);
	}

	prepare_toolbar() {
		this.products_section.append(`
			<div class="toolbar d-flex align-items-center justify-content-between mb-4">
			</div>
		`);
		this.prepare_search();
		this.prepare_view_toggler();

		new webshop.ProductSearch();
	}

	prepare_view_toggler() {
		this.render_view_toggler();
		this.bind_view_toggler_actions();
		this.set_view_state();
	}

	get_item_filter_data(from_filters=false) {
		let me = this;
		this.from_filters = from_filters;
		let args = this.get_query_filters();

		this.disable_view_toggler(true);

		frappe.call({
			method: "webshop.webshop.api.get_product_filter_data",
			args: {
				query_args: args
			},
			callback: function(result) {
				if (!result || result.exc || !result.message || result.message.exc) {
					me.render_no_products_section(true);
				} else {
					if (me.item_group && result.message["sub_categories"].length) {
						me.render_item_sub_categories(result.message["sub_categories"]);
					}

					if (!result.message["items"].length) {
						me.render_no_products_section();
					} else {
						me.re_render_discount_filters(result.message["filters"].discount_filters);

						// Render List, Grid, and Map Views
						me.render_list_view(result.message["items"], result.message["settings"]);
						me.render_grid_view(result.message["items"], result.message["settings"]);
						me.render_map_view(result.message["items"], result.message["settings"]);

						me.products = result.message["items"];
						me.product_count = result.message["items_count"];
					}

					if (!from_filters) {
						me.bind_filters();
						me.restore_filters_state();
					}

					me.add_paging_section(result.message["settings"]);
				}

				me.disable_view_toggler(false);
			}
		});
	}

	disable_view_toggler(disable=false) {
		$('#list').prop('disabled', disable);
		$('#image-view').prop('disabled', disable);
		$('#map-view').prop('disabled', disable);
	}

	render_grid_view(items, settings) {
		let me = this;
		this.prepare_product_area_wrapper("grid");

		new webshop.ProductGrid({
			items: items,
			products_section: $("#products-grid-area"),
			settings: settings,
			preference: me.preference
		});
	}

	render_list_view(items, settings) {
		let me = this;
		this.prepare_product_area_wrapper("list");

		new webshop.ProductList({
			items: items,
			products_section: $("#products-list-area"),
			settings: settings,
			preference: me.preference
		});
	}

	render_map_view(items, settings) {
		let me = this;
		if (!$("#products-map-area").length) {
			this.products_section.append(`
				<div id="products-map-area" class="products-list mt-3 ${me.preference === 'Map View' ? '' : 'hidden'}">
					<div class="card p-3 shadow-sm border-0 mb-3" style="border-radius: 14px;">
						<div class="d-flex justify-content-between align-items-center mb-2">
							<h5 class="mb-0 font-weight-bold" style="color: #0f172a;">🗺️ Products & Provider Map</h5>
							<a href="/map" class="btn btn-sm btn-outline-primary rounded-pill">Open Fullscreen Map &rarr;</a>
						</div>
						<p class="text-muted small mb-3">Explore seller locations and browse products available by area across Ethiopia.</p>
						<div id="shop-embedded-map" style="height: 520px; width: 100%; border-radius: 12px; z-index: 1;"></div>
					</div>
				</div>
			`);
		}

		if (me.preference === 'Map View') {
			setTimeout(() => { me.init_embedded_map(); }, 200);
		}
	}

	init_embedded_map() {
		if (this.map_initialized || !window.L) {
			if (!window.L) {
				// Dynamically load Leaflet if not present
				let link = document.createElement("link");
				link.rel = "stylesheet";
				link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
				document.head.appendChild(link);

				let script = document.createElement("script");
				script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
				script.onload = () => { this.init_embedded_map(); };
				document.head.appendChild(script);
				return;
			}
		}

		const mapElem = document.getElementById('shop-embedded-map');
		if (!mapElem) return;

		if (this.leaflet_map) {
			this.leaflet_map.invalidateSize();
			return;
		}

		const map = L.map('shop-embedded-map').setView([9.0108, 38.7617], 12);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors | EthioBiz.et',
			maxZoom: 19
		}).addTo(map);

		this.leaflet_map = map;
		this.map_initialized = true;

		// Fetch companies and add pins
		fetch('/api/method/bismillah_ethiobiz.company_map_api.get_company_locations')
			.then(r => r.json())
			.then(res => {
				const companies = res.message ? res.message.companies : [];
				companies.forEach(c => {
					const marker = L.marker([c.lat, c.lng]).addTo(map);
					marker.bindPopup(`
						<div style="font-family: inherit; min-width: 180px;">
							<h6 style="margin: 0 0 4px 0; font-weight: 700;">${c.name}</h6>
							<span style="font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">${c.category}</span>
							<div style="font-size: 12px; color: #64748b; margin-top: 6px;">📍 ${c.address || 'Addis Ababa'}</div>
							<a href="${c.shop_url}" style="display: block; margin-top: 8px; background: #008080; color: white; text-align: center; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-decoration: none;">View Store Products</a>
						</div>
					`);
				});
			});
	}

	prepare_product_area_wrapper(view) {
		let left_margin = view == "list" ? "ml-2" : "";
		let top_margin = view == "list" ? "mt-6" : "mt-minus-1";
		return this.products_section.append(`
			<div id="products-${view}-area" class="row products-list ${ top_margin } ${ left_margin }" itemscope itemtype="https://schema.org/Product"></div>
		`);
	}

	get_query_filters() {
		const filters = frappe.utils.get_query_params();
		let {field_filters, attribute_filters} = filters;

		field_filters = field_filters ? JSON.parse(field_filters) : {};
		attribute_filters = attribute_filters ? JSON.parse(attribute_filters) : {};

		return {
			field_filters: field_filters,
			attribute_filters: attribute_filters,
			item_group: this.item_group,
			start: filters.start || null,
			from_filters: this.from_filters || false
		};
	}

	add_paging_section(settings) {
		$(".product-paging-area").remove();

		if (this.products && this.preference !== 'Map View') {
			let paging_html = `
				<div class="row product-paging-area mt-5">
					<div class="col-3"></div>
					<div class="col-9 text-right">
			`;
			let query_params = frappe.utils.get_query_params();
			let start = query_params.start ? cint(JSON.parse(query_params.start)) : 0;
			let page_length = settings.products_per_page || 0;

			let prev_disable = start > 0 ? "" : "disabled";
			let next_disable = (this.product_count > page_length) ? "" : "disabled";

			paging_html += `
				<button class="btn btn-default btn-prev" data-start="${ start - page_length }"
					style="float: left" ${prev_disable}>
					${ __("Prev") }
				</button>`;

			paging_html += `
				<button class="btn btn-default btn-next" data-start="${ start + page_length }"
					${next_disable}>
					${ __("Next") }
				</button>
			`;

			paging_html += `</div></div>`;

			$(".page_content").append(paging_html);
			this.bind_paging_action();
		}
	}

	prepare_search() {
		$(".toolbar").append(`
			<div class="input-group col-7 col-md-8 p-0">
				<div class="dropdown w-100" id="dropdownMenuSearch">
					<input type="search" name="query" id="search-box" class="form-control font-md"
						placeholder="${__("Search for Products")}"
						aria-label="Product" aria-describedby="button-addon2" style="border-radius: 20px;">
				</div>
			</div>
		`);
	}

	render_view_toggler() {
		$(".toolbar").append(`
			<div class="toggle-container col-5 col-md-4 p-0 d-flex justify-content-end align-items-center gap-1">
				<div class="btn-group" role="group" aria-label="Product View Toggler">
					<button id="list" class="btn btn-sm btn-list-view btn-outline-secondary" title="${__('List View')}">
						<span>☰</span> <span class="d-none d-lg-inline">${__('List')}</span>
					</button>
					<button id="image-view" class="btn btn-sm btn-grid-view btn-outline-secondary" title="${__('Grid View')}">
						<span>⊞</span> <span class="d-none d-lg-inline">${__('Grid')}</span>
					</button>
					<button id="map-view" class="btn btn-sm btn-map-view btn-outline-secondary" title="${__('Map View')}">
						<span>🗺️</span> <span class="d-none d-lg-inline">${__('Map View')}</span>
					</button>
				</div>
			</div>
		`);
	}

	bind_view_toggler_actions() {
		let me = this;

		$("#list").click(function() {
			$(".btn-list-view, .btn-grid-view, .btn-map-view").removeClass('btn-primary').addClass('btn-outline-secondary');
			$(this).removeClass('btn-outline-secondary').addClass('btn-primary');

			$("#products-grid-area").addClass("hidden");
			$("#products-map-area").addClass("hidden");
			$("#products-list-area").removeClass("hidden");
			$(".product-paging-area").removeClass("hidden");
			localStorage.setItem("product_view", "List View");
			me.preference = "List View";
		});

		$("#image-view").click(function() {
			$(".btn-list-view, .btn-grid-view, .btn-map-view").removeClass('btn-primary').addClass('btn-outline-secondary');
			$(this).removeClass('btn-outline-secondary').addClass('btn-primary');

			$("#products-list-area").addClass("hidden");
			$("#products-map-area").addClass("hidden");
			$("#products-grid-area").removeClass("hidden");
			$(".product-paging-area").removeClass("hidden");
			localStorage.setItem("product_view", "Grid View");
			me.preference = "Grid View";
		});

		$("#map-view").click(function() {
			$(".btn-list-view, .btn-grid-view, .btn-map-view").removeClass('btn-primary').addClass('btn-outline-secondary');
			$(this).removeClass('btn-outline-secondary').addClass('btn-primary');

			$("#products-list-area").addClass("hidden");
			$("#products-grid-area").addClass("hidden");
			$("#products-map-area").removeClass("hidden");
			$(".product-paging-area").addClass("hidden");
			localStorage.setItem("product_view", "Map View");
			me.preference = "Map View";
			me.init_embedded_map();
		});
	}

	set_view_state() {
		if (this.preference === "List View") {
			$("#list").removeClass('btn-outline-secondary').addClass('btn-primary');
			$("#image-view, #map-view").removeClass('btn-primary').addClass('btn-outline-secondary');
			$("#products-list-area").removeClass("hidden");
			$("#products-grid-area, #products-map-area").addClass("hidden");
		} else if (this.preference === "Map View") {
			$("#map-view").removeClass('btn-outline-secondary').addClass('btn-primary');
			$("#list, #image-view").removeClass('btn-primary').addClass('btn-outline-secondary');
			$("#products-map-area").removeClass("hidden");
			$("#products-list-area, #products-grid-area").addClass("hidden");
			this.init_embedded_map();
		} else {
			$("#image-view").removeClass('btn-outline-secondary').addClass('btn-primary');
			$("#list, #map-view").removeClass('btn-primary').addClass('btn-outline-secondary');
			$("#products-grid-area").removeClass("hidden");
			$("#products-list-area, #products-map-area").addClass("hidden");
		}
	}

	bind_paging_action() {
		let me = this;
		$('.btn-prev, .btn-next').click((e) => {
			const $btn = $(e.target);
			me.from_filters = false;

			$btn.prop('disabled', true);
			const start = $btn.data('start');

			let query_params = frappe.utils.get_query_params();
			query_params.start = start;
			let path = window.location.pathname + '?' + frappe.utils.get_url_from_dict(query_params);
			window.location.href = path;
		});
	}

	re_render_discount_filters(filter_data) {
		this.get_discount_filter_html(filter_data);
		if (this.from_filters) {
			this.bind_discount_filter_action();
		}
		this.restore_discount_filter();
	}

	get_discount_filter_html(filter_data) {
		$("#discount-filters").remove();
		if (filter_data) {
			$("#product-filters").append(`
				<div id="discount-filters" class="mb-4 filter-block pb-5">
					<div class="filter-label mb-3">${ __("Discounts") }</div>
				</div>
			`);

			let html = `<div class="filter-options">`;
			filter_data.forEach(filter => {
				html += `
					<div class="checkbox">
						<label data-value="${ filter[0] }">
							<input type="radio"
								class="product-filter discount-filter"
								name="discount" id="${ filter[0] }"
								data-filter-name="discount"
								data-filter-value="${ filter[0] }"
								style="width: 14px !important"
							>
								<span class="label-area" for="${ filter[0] }">
									${ filter[1] }
								</span>
						</label>
					</div>
				`;
			});
			html += `</div>`;

			$("#discount-filters").append(html);
		}
	}

	restore_discount_filter() {
		const filters = frappe.utils.get_query_params();
		let field_filters = filters.field_filters;
		if (!field_filters) return;

		field_filters = JSON.parse(field_filters);

		if (field_filters && field_filters["discount"]) {
			const values = field_filters["discount"];
			const selector = values.map(value => {
				return `input[data-filter-name="discount"][data-filter-value="${value}"]`;
			}).join(',');
			$(selector).prop('checked', true);
			this.field_filters = field_filters;
		}
	}

	bind_discount_filter_action() {
		let me = this;
		$('.discount-filter').on('change', (e) => {
			const $checkbox = $(e.target);
			const is_checked = $checkbox.is(':checked');

			const {
				filterValue: filter_value
			} = $checkbox.data();

			delete this.field_filters["discount"];

			if (is_checked) {
				this.field_filters["discount"] = [];
				this.field_filters["discount"].push(filter_value);
			}

			if (this.field_filters["discount"].length === 0) {
				delete this.field_filters["discount"];
			}

			me.change_route_with_filters();
		});
	}

	bind_filters() {
		let me = this;
		this.field_filters = {};
		this.attribute_filters = {};

		$('.product-filter').on('change', (e) => {
			me.from_filters = true;

			const $checkbox = $(e.target);
			const is_checked = $checkbox.is(':checked');

			if ($checkbox.is('.attribute-filter')) {
				const {
					attributeName: attribute_name,
					attributeValue: attribute_value
				} = $checkbox.data();

				if (is_checked) {
					this.attribute_filters[attribute_name] = this.attribute_filters[attribute_name] || [];
					this.attribute_filters[attribute_name].push(attribute_value);
				} else {
					this.attribute_filters[attribute_name] = this.attribute_filters[attribute_name] || [];
					this.attribute_filters[attribute_name] = this.attribute_filters[attribute_name].filter(v => v !== attribute_value);
				}

				if (this.attribute_filters[attribute_name].length === 0) {
					delete this.attribute_filters[attribute_name];
				}
			} else if ($checkbox.is('.field-filter') || $checkbox.is('.discount-filter')) {
				const {
					filterName: filter_name,
					filterValue: filter_value
				} = $checkbox.data();

				if ($checkbox.is('.discount-filter')) {
					delete this.field_filters["discount"];
				}
				if (is_checked) {
					this.field_filters[filter_name] = this.field_filters[filter_name] || [];
					if (!in_list(this.field_filters[filter_name], filter_value)) {
						this.field_filters[filter_name].push(filter_value);
					}
				} else {
					this.field_filters[filter_name] = this.field_filters[filter_name] || [];
					this.field_filters[filter_name] = this.field_filters[filter_name].filter(v => v !== filter_value);
				}

				if (this.field_filters[filter_name].length === 0) {
					delete this.field_filters[filter_name];
				}
			}

			me.change_route_with_filters();
		});

		$('.filter-lookup-input').on('keydown', frappe.utils.debounce((e) => {
			const $input = $(e.target);
			const keyword = ($input.val() || '').toLowerCase();
			const $filter_options = $input.next('.filter-options');

			$filter_options.find('.filter-lookup-wrapper').show();
			$filter_options.find('.filter-lookup-wrapper').each((i, el) => {
				const $el = $(el);
				const value = $el.data('value').toLowerCase();
				if (!value.includes(keyword)) {
					$el.hide();
				}
			});
		}, 300));
	}

	change_route_with_filters() {
		let route_params = frappe.utils.get_query_params();

		let start = this.if_key_exists(route_params.start) || 0;
		if (this.from_filters) {
			start = 0;
		}

		const query_string = this.get_query_string({
			start: start,
			field_filters: JSON.stringify(this.if_key_exists(this.field_filters)),
			attribute_filters: JSON.stringify(this.if_key_exists(this.attribute_filters)),
		});
		window.history.pushState('filters', '', `${location.pathname}?` + query_string);

		$('.page_content input').prop('disabled', true);

		this.make(true);
		$('.page_content input').prop('disabled', false);
	}

	restore_filters_state() {
		const filters = frappe.utils.get_query_params();
		let {field_filters, attribute_filters} = filters;

		if (field_filters) {
			field_filters = JSON.parse(field_filters);
			for (let fieldname in field_filters) {
				const values = field_filters[fieldname];
				const selector = values.map(value => {
					return `input[data-filter-name="${fieldname}"][data-filter-value="${value}"]`;
				}).join(',');
				$(selector).prop('checked', true);
			}
			this.field_filters = field_filters;
		}
		if (attribute_filters) {
			attribute_filters = JSON.parse(attribute_filters);
			for (let attribute in attribute_filters) {
				const values = attribute_filters[attribute];
				const selector = values.map(value => {
					return `input[data-attribute-name="${attribute}"][data-attribute-value="${value}"]`;
				}).join(',');
				$(selector).prop('checked', true);
			}
			this.attribute_filters = attribute_filters;
		}
	}

	render_no_products_section(error=false) {
		let error_section = `
			<div class="mt-4 w-100 alert alert-error font-md">
				${ __("Something went wrong. Please refresh or contact us.") }
			</div>
		`;
		let no_results_section = `
			<div class="cart-empty frappe-card mt-4">
				<div class="cart-empty-state">
					<img src="/assets/webshop/images/cart-empty-state.png" alt="Empty Cart">
				</div>
				<div class="cart-empty-message mt-4">${ __("No products found") }</p>
			</div>
		`;

		this.products_section.append(error ? error_section : no_results_section);
	}

	render_item_sub_categories(categories) {
		if (categories && categories.length) {
			let sub_group_html = `
				<div class="sub-category-container scroll-categories">
			`;

			categories.forEach(category => {
				sub_group_html += `
					<a href="/${ category.route || '#' }" style="text-decoration: none;">
						<div class="category-pill">
							${ category.name }
						</div>
					</a>
				`;
			});
			sub_group_html += `</div>`;

			$("#product-listing").prepend(sub_group_html);
		}
	}

	get_query_string(object) {
		const url = new URLSearchParams();
		for (let key in object) {
			const value = object[key];
			if (value) {
				url.append(key, value);
			}
		}
		return url.toString();
	}

	if_key_exists(obj) {
		let exists = false;
		for (let key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key]) {
				exists = true;
				break;
			}
		}
		return exists ? obj : undefined;
	}
};
