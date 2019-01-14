define(["modules/jquery-mozu", 'modules/api', "underscore", "hyprlive", "modules/backbone-mozu", "hyprlivecontext", 'modules/mozu-grid/mozugrid-view', 'modules/mozu-grid/mozugrid-pagedCollection', "modules/views-paging", 'modules/editable-view', 'modules/models-customer', 'pages/myaccount'], function ($, api, _, Hypr, Backbone, HyprLiveContext, MozuGrid, MozuGridCollection, PagingViews, EditableView, CustomerModels, MyAccount) {
  var ReturnsView = Backbone.MozuView.extend({
      templateName: "modules/b2b-account/returns/returns",
      initialize: function(){
        var self = this;
        Backbone.MozuView.prototype.initialize.apply(this, arguments);
        self.model.set('viewingAllReturns', true);
      },
      render: function(){
        var self = this;
        Backbone.MozuView.prototype.render.apply(this, arguments);
        var collection = new ReturnsGridCollectionModel({autoload: false});
        var returnHistory = CustomerModels.Customer.fromCurrent().get('returnHistory');
        collection.set(returnHistory);
        this.initializeGrid(collection);
      },
      initializeGrid: function(collection){
          var self = this;
          self.returnsGrid = new MozuGrid({
              el: $('.mz-b2b-returns-grid'),
              model: collection
          });
          self.returnsGrid.listenTo(self.returnsGrid.model, 'viewReturn', self.viewReturn.bind(self));
          if (self.model.get('viewingAllReturns')){
              self.returnsGrid.render();
          } else {
              api.get('rmas', { filter: 'userId eq ' + self.model.get('userId')}).then(function(res){
                  collection.set(res.data);
                  self.returnsGrid.render();
              });
          }
      },
      printReturnLabel: function(e) {
            var self = this,
                $target = $(e.currentTarget);

            //Get Whatever Info we need to our shipping label
            var returnId = $target.data('mzReturnid'),
                returnObj = self.model.get('currentReturn');

            var _totalRequestCompleted = 0;

            _.each(returnObj.packages, function(value, key, list) {
                window.accountModel.apiGetReturnLabel({
                    'returnId': returnId,
                    'packageId': value.id,
                    'returnAsBase64Png': true
                }).then(function(data) {
                    value.labelImageSrc = 'data:image/png;base64,' + data;
                    _totalRequestCompleted++;
                    if (_totalRequestCompleted == list.length) {
                        var returnModel = new Backbone.MozuModel(returnObj);
                        var printReturnLabelView = new MyAccount.ReturnPrintLabelView({
                            el: $('#mz-printReturnLabelView'),
                            model: returnModel
                        });
                        printReturnLabelView.render();
                        printReturnLabelView.loadPrintWindow();
                    }
                });
            });

        },
      toggleReturnsGridSource: function(e){
        var self = this;
        if (self.model.get('viewingAllReturns')){
            self.model.set('viewingAllReturns', false);
            if (self.returnsGrid) {
                self.returnsGrid.model.filter('userId eq '+self.model.get('userId')).then(function(response){
                    self.returnsGrid.model.set('items', response.data.items);
                    self.returnsGrid.render();
                });
            }
        } else {
            self.model.set('viewingAllReturns', true);
            self.returnsGrid.model.filter('');
        }
        self.render();
      },
      viewReturn: function(row){
        this.model.set('viewReturn', true);
        this.model.set('currentReturn', row.toJSON());
        this.render();
    },
      returnToGrid: function(){
          this.model.set('viewReturn', false);
          this.render();
      }
  });

  var ReturnsGridCollectionModel = MozuGridCollection.extend({
      mozuType: 'rmas',
      columns: [
          {
              index: 'returnNumber',
              displayName: 'Return ID',
              sortable: true
          },
          {
              index: 'originalOrderNumber',
              displayName: 'Order ID',
              sortable: true
          },
          {
              index: 'auditInfo',
              displayName: 'Submitted Date',
              sortable: true,
              displayTemplate: function(auditInfo){
                  var date = new Date(auditInfo.createDate);
                  return date.toLocaleDateString();
              }
          },
          {
              index: 'createdBy',
              displayName: 'Created By',
              sortable: false,
              displayTemplate: function(createdBy){
                  // We'll need to do extra work to get this.
                  if (createdBy) return createdBy;
                  return "";
              }
          },
          {
              index: 'status',
              displayName: 'Return Status',
              sortable: false
          }
      ],
      rowActions: [
        {
            displayName: 'View',
            action: 'viewReturn'
        }
      ],
      relations: {
          items: Backbone.Collection.extend({})
      },
      viewReturn: function(e, row){
          this.trigger('viewReturn', row);
      },
      backToGrid: function(){
          this.set('viewReturn', false);
      }
  });

  return {
    'ReturnsView': ReturnsView
  };

});
