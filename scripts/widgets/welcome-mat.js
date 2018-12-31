require([
  "underscore",
  "modules/jquery-mozu",
  "hyprlive",
  "modules/modal-dialog",
  "modules/backbone-mozu",
  "modules/api"
], function(_, $, Hypr, modelDialog, Backbone, api) {
  //set base url
  var baseURL = window.location.origin + "/borderFree/";
  //Welcome mat widget template
  var WelcomeMatWidgetView = Backbone.MozuView.extend({
    templateName: "modules/borderFree/welcome-mat-widget",
    additionalEvents: {
      "change #country-select": "setCountry",
      "click #btnCountrySelect": "openWelcomeMatWidget"
    },
    initialize: function() {},
    render: function() {
      Backbone.MozuView.prototype.render.apply(this);
      return this;
    },
    openWelcomeMatWidget: function() {
      $("#countryModal").modal("show");
    },
    getCountries: function(e) {
      // e.prevntDefault();
      var self = this;
      //console.log("getCountries!!");
      var hasCountries = JSON.parse(window.sessionStorage.getItem("countries")),
        hasCurrencies = JSON.parse(window.sessionStorage.getItem("currencies"));
      if (hasCountries !== null && hasCurrencies !== null) {
        var appConfig = $("[data-mz-welcome-mat-request]").data(
            "mzWelcomeMatRequest"
          ),
          selectedCurrency = $.cookie("currency_code_override"),
          selectedCountry = $.cookie("selected_country");
        if (_.isUndefined($.cookie("selected_country"))) selectedCountry = "";
        if (_.isUndefined($.cookie("currency_code_override")))
          selectedCurrency = appConfig.currency;
        self.model.set({
          country: hasCountries,
          selectedCountry: selectedCountry,
          selectedCurrency: selectedCurrency,
          currency: hasCurrencies,
          defaultCountry: appConfig.country
        });
        window.view.render();
        if (self.$el.find(".welcome-mat-wrapper").hasClass("hidden")) {
          self.$el.find(".welcome-mat-wrapper").removeClass("hidden");
        }
      } else {
        api.request("GET", baseURL + "getBorderFreeCountries").then(
          function(resp) {
            //Check if there is some resp
            if (!_.isUndefined(resp.message)) {
              //check if its success and has resp data
              if (
                !_.isUndefined(resp.message.payload.getLocalizationDataResponse)
              ) {
                var rawRespData =
                  resp.message.payload.getLocalizationDataResponse;
                //console.log(rawRespData);
                //Filter responseData and make countriesData
                var borderFreeCountries = _.map(
                  _.where(rawRespData.countries.country, {}),
                  function(item) {
                    return {
                      name: item.name,
                      currencyCode: item.currencyCode,
                      locale: item.locale,
                      languageCode: item.languageCode
                    };
                  }
                );
                //Filter responseData and make currenciesData
                var borderFreeCurrencies = _.map(
                  _.where(rawRespData.currencies.currency, {}),
                  function(item) {
                    return {
                      name: item.name,
                      symbol: item.symbol,
                      isCurrencyEnabled: item.isCurrencyEnabled
                    };
                  }
                );
                //save countries in localStorage
                self.setSessionStorage("countries", borderFreeCountries);
                //save currencies
                self.setSessionStorage("currencies", borderFreeCurrencies);

                var appConfig = $("[data-mz-welcome-mat-request]").data(
                  "mzWelcomeMatRequest"
                );
                //set model data and render
                self.model.set({
                  country: borderFreeCountries,
                  selectedCountry: "",
                  selectedCurrency: appConfig.currency,
                  defaultCountry: appConfig.country,
                  currency: borderFreeCurrencies
                });
                self.render();
                //hide/show welcome mat widget
                if (self.$el.find(".welcome-mat-wrapper").hasClass("hidden")) {
                  self.$el.find(".welcome-mat-wrapper").removeClass("hidden");
                }
              } else {
                console.log("Unexpected error occured, Please check app configuration!!"); // jshint ignore:line
              }
            } else {
              console.log("Unable to conenct, Please check app configuration!!"); // jshint ignore:line
            }
          },
          function(e) {
            console.log(e); // jshint ignore:line
          }
        );
      }
    },
    setSessionStorage: function(name, data) {
      //console.log(name, data);
      window.sessionStorage.setItem(name, JSON.stringify(data));
    },
    saveCookie: function(e) {
      var btnSave = $(e.currentTarget);
      btnSave.addClass("is-loading");
      var self = this;
      //console.log(self.$el.find("#country-select option").length);
      var selectedCountry = self.$el.find("#country-select"),
        selectedCurrency = self.$el.find("#currency-select");

      var postData = {
        currencyCode: "USD",
        toCurrencyCode: selectedCurrency.val()
      };
      api
        .request("POST", baseURL + "getBorderFreeExchangeRates", postData)
        .then(
          function(resp) {
            //console.log(resp);
            //console.log("saving...");
            var selectedCountryName = $(selectedCountry).find(
              "option:selected"
            );

            self.setCookies(
              "currency_code_override",
              selectedCurrency.val(),
              1
            );
            self.setCookies(
              "selected_country",
              $.trim(selectedCountryName.text()),
              1
            );
            self.setCookies(
              "currency_country_code",
              selectedCountryName.attr("data-code"),
              1
            );
            self.setCookies("currency_QuoteId", resp.referenceData, 1);
            self.$el.find(".selectedCountry").text(selectedCountryName.text());
            //console.log(selectedCountryName.text());
            window.location.reload();
          },
          function(e) {
            console.log(e); // jshint ignore:line
          }
        );
    },
    setCookies: function(cname, cvalue, exdays) {
      var d = new Date();
      d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
      var expires = "expires=" + d.toUTCString();
      //$.cookie(cname, cvalue, expires);
      //console.log("cookie saved!!");
      document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    },
    setCountry: function(e) {
      var self = this,
        currentTarget = $(e.currentTarget),
        currencySelect = self.$el.find("#currency-select");
      //Update currency value with selected country
      currencySelect.val(currentTarget.val());

      //check if USA is selected
      if (currentTarget.find("option:selected").attr("data-code") == "US") {
        currencySelect.prop("disabled", true);
      } else {
        currencySelect.prop("disabled", false);
      }
    }
  });

  $(document).ready(function() {
    var welcomeMatViewModel = Backbone.MozuModel.extend();
    var welcomeMatWidgetModel = new welcomeMatViewModel();
    var welcomeMatWidgetView = (window.view = new WelcomeMatWidgetView({
      el: $(".welcome-mat-widget"),
      model: welcomeMatWidgetModel
    }));
    welcomeMatWidgetView.getCountries();
    //welcomeMatWidgetView.render();
  });
});