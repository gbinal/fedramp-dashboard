(function () {
    'use strict';

    angular
        .module('fedramp')
        .controller('HomeController', HomeController);

    HomeController.$inject = ['$log', 'providers', 'CsvService'];

    /**
     * @constructor
     * @memberof Controllers
     */
    function HomeController ($log, providers, CsvService) {
        var self = this;
        var lastFilterType = '';
        var downloadBlob = null;

        /**
         * The title displayed on the home page
         * @member {string}
         * @memberof Controllers.HomeController
         */
        self.title = 'FedRAMP';

        /**
         * The download URL
         * @member {string}
         * @memberof Controllers.HomeController
         */
        self.downloadUrl = '#';

        /**
         * The data after filters have been applied
         * @member {array}
         * @memberof Controllers.HomeController
         */
        self.filteredData = [];

        /**
         * The type of filter applied to the data
         * @member {string}
         * @memberof Controllers.HomeController
         */
        self.filterType = '';

        /**
         * The filter specific options
         * @member {array}
         * @memberof Controllers.HomeController
         */
        self.filterOptions = [];

        /**
         * The filter applied to the data
         * @member {string}
         * @memberof Controllers.HomeController
         */
        self.filter = '';

        /**
         * Determines if data is present
         * @public
         * @memberof Controllers.HomeController
         *
         * @returns
         *  A value indicating if any data is stored
         */
        self.hasData = function () {
            return providers && providers.length > 0;
        };

        /**
         * Applies the filter(s) to the raw data set
         * @public
         * @memberof Controllers.HomeController
         *
         * @param {string} type
         *  (optional) The filter type
         * @param {string} filter
         *  (optional) The filter value
         */
        self.applyFilter = function (type, filter) {
            type = type ? type : self.filterType;
            filter = filter ? filter : self.filter;

            // If there is no filter applied then we show everything
            if (!type || !filter) {
                self.filteredData = providers;
                return;
            }

            // Place any items matching the filter in an array so we
            // can replace the filtered data in bulk and reduce UI
            // flickering.
            var prefiltered = [];
            var i, p, j, l;

            switch (type) {
            case 'csp':
                for (i = 0; i < providers.length; i++) {
                    p = providers[i];
                    if (p.name.indexOf(filter) !== -1) {
                        prefiltered.push(p);
                    }
                }
                break;

            case 'cso':
                for (i = 0; i < providers.length; i++) {
                    p = providers[i];
                    if (p.pkg.indexOf(filter) !== -1) {
                        prefiltered.push(p);
                    }
                }
                break;

            case 'agency':
                for (i = 0; i < providers.length; i++) {
                    p = providers[i];
                    if ((p.sponsoringAgency + p.sponsoringSubagency).indexOf(filter) !== -1) {
                        prefiltered.push(p);
                    } else {
                        // NOTE: Determine if it is necessary to check the leveraged ATO letters
                        for (j = 0; j < p.atoLetters.length; j++) {
                            l = p.atoLetters[j];
                            if ((l.authorizingAgency + l.authorizingSubagency).indexOf(filter) !== -1) {
                                prefiltered.push(p);
                                break;
                            }
                        }
                    }
                }
                break;

            case '3pao':
                // TODO: I believe the 3pao references apply to the
                // "Independent Assessor" column in the originating source.
                // If that is the case this is currently not mapped in the
                // JSON data source.
                break;
            }

            self.filteredData = prefiltered;
            self.downloadUrl = '#';
            downloadBlob = null;

            // Parse the data here
            var csv = CsvService.toCsv(CsvService.flattenProviders(prefiltered));
            if (csv) {
                downloadBlob = new Blob([csv], {type: 'text/csv;charset=utf-8;' });
                self.downloadUrl = window.URL.createObjectURL(downloadBlob);
            }
        };

        /**
         * Toggles the checked state for the major filters
         * @public
         * @memberof Controllers.HomeController
         *
         * @param {string} type
         *  (optional) The filter type
         */
        self.toggleFilter = function (type) {
            type = type ? type : self.filterType;

            if (lastFilterType === type) {
                self.filterType = '';
                return;
            }

            lastFilterType = type;
            var options = [];
            var i, p, j, l;

            switch (type) {
            case 'csp':
                for (i = 0; i < providers.length; i++) {
                    p = providers[i];
                    if (p.name && !contains(options, p.name)) {
                        options.push(p.name);
                    }
                }
                break;

            case 'cso':
                for (i = 0; i < providers.length; i++) {
                    p = providers[i];
                    if (p.pkg && !contains(options, p.pkg)) {
                        options.push(p.pkg);
                    }
                }
                break;

            case 'agency':
                for (i = 0; i < providers.length; i++) {
                    p = providers[i];
                    if (p.sponsoringAgency && !contains(options, p.sponsoringAgency)) {
                        options.push(p.sponsoringAgency);
                    }

                    if (p.sponsoringSubagency && !contains(options, p.sponsoringSubagency)) {
                        options.push(p.sponsoringSubagency);
                    }

                    // NOTE: Determine if it is necessary to check the leveraged ATO letters
                    for (j = 0; j < p.atoLetters.length; j++) {
                        l = p.atoLetters[j];
                        if (l.authorizingAgency && !contains(options, l.authorizingAgency)) {
                            options.push(l.authorizingAgency);
                        }

                        if (l.authorizingSubagency && !contains(options, l.authorizingSubagency)) {
                            options.push(l.authorizingSubagency);
                        }
                    }
                }
                break;

            case '3pao':
                // TODO: I believe the 3pao references apply to the
                // "Independent Assessor" column in the originating source.
                // If that is the case this is currently not mapped in the
                // JSON data source.
                break;
            }

            self.filterOptions = options;
        };

        /**
         * Filters and transforms data for download
         * @public
         * @memberof Controllers.HomeController
         */
        self.download = function () {
            $log.info('Download clicked');

            if (navigator.msSaveBlob && downloadBlob) {
                // IE 11 and Edge
                navigator.msSaveBlob(downloadBlob, self.filename());
            }
        };

        /**
         * Generates the file name to be used when downloading the data
         * @public
         * @memberof Controllers.HomeController
         *
         * @returns
         *  A file name in the format "fedramp-YYYY-mm-dd.csv"
         */
        self.filename = function (date) {
            if (!date) {
                date = new Date();
            }

            var dd = date.getDate();
            var mm = date.getMonth() + 1;
            var yyyy = date.getFullYear();

            if (dd < 10) {
                dd = '0' + dd;
            }

            if (mm < 10) {
                mm = '0' + mm;
            }

            return 'fedramp-' + yyyy + '-' + mm + '-' + dd + '.csv';
        };

        /**
         * Total authorized cloud service providers
         * @public
         * @memberof Controllers.HomeController
         *
         * @returns
         *  The total authorized cloud service providers
         */
        self.totalAuthorized = function () {
            var totalAuthorized = 0;

            var counted = [];
            for (var i = 0; i < providers.length; i++) {
                var p = providers[i];
                if (p.name && !contains(counted, p.name)) {
                    counted.push(p.name);
                    totalAuthorized++;
                }
            }

            return totalAuthorized;
        };

        /**
         * The cost savings at a fixed rate per re-use
         * @public
         * @memberof Controllers.HomeController
         *
         * @returns
         *  The total cost savings
         */
        self.totalCostSavings = function () {
            return Number(250000 * self.leveragedAtos()).toLocaleString('en');
        };

        /**
         * The total leveraged ATO letters from authorized cloud service providers
         * @public
         * @memberof Controllers.HomeController
         *
         * @returns
         *  The total leveraged ATO letters
         */

        self.leveragedAtos = function(){
          let totalReuses = 0;
          data.forEach(csp =>{
            totalReuses += self.calcCSPRuse(csp, providers, false);
          });
          return totalReuses;
        };

        /**
         * The total leveraged ATO letters from authorized cloud service providers
         * @public
         * @memberof Controllers.HomeController
         *
         * @returns
         *  Appends a list of the number of times leveraged by dependent package id to the provided array of CSPs
         *
         * @param {array} data
         * The an array of all of the CSP data
         */

        self.displayReuse = function (data) {
          data.forEach(csp =>{
            csp['Dependent_CSP'] = self.calcCSPRuse(csp, data, true);
          });
          return data;
        };

        /**
         * The total leveraged ATO letters from authorized cloud service providers
         * @public
         * @memberof Controllers.HomeController
         *
         * @returns
         *  An object of the number of times a CSP was reused by package id if asObject = true. If asObject = false, it will return the sum of the reuses for an individual CSP if
         * @param {ojbect} csp
         * The information for an individual CSP
         * @param {array} fullData
         * The information for all of the CSPs
         * @param {boolean} asObject
         * True/False to determine where to return an array of object reuses or the total sum of reueses
         */

        self.calcCSPRuse = function(csp, fullData, asObject){
          const directlyLeveraged = csp.Leveraged_ATO_Letters.length;
          const leveragedATOs = fullData.filter(otherCSP => {
            if(otherCSP.Underlying_CSP_Package_ID){
              return otherCSP.Underlying_CSP_Package_ID.includes(csp.Package_ID);
             }
          });
          if(asObject){ // Allows this function to be used to return an object of
            return leveragedATOs.map(otherCSP => {
              var rObj = {};
              rObj[otherCSP.Package_ID] = otherCSP.Leveraged_ATO_Letters.length + 1; //Add the plus one for the unleveraged CSP
              return rObj;} );
          }
          else{ // Return just the total sum
            // Calculate Number
            let summedReuses = leveragedATOs.length; // Add the unleveraged ATOs that use this CSP (if not and underlying CSP will be 0)
            if(leveragedATOs.length > 0){
              summedReuses += leveragedATOs.map(otherCSP => otherCSP.Leveraged_ATO_Letters.length).reduce( (prev, curr) => prev + curr ); // Add leveraged ATO of CSP dependencies
            }
            let reuses = directlyLeveraged + summedReuses;
            return reuses;
          }

        };

        /**
         * Iterate through an array checking if the value already exists
         * @private
         * @memberof Controllers.HomeController
         *
         * @param {array} array
         *  The array to iterate through
         * @param {object} value
         *  The value to search
         *
         * @returns
         *  A value indicating if the value is contained in the array
         */
        function contains(array, value) {
            for (var i = 0; i < array.length; i++) {
                if (array[i] === value) {
                    return true;
                }
            }
            return false;
        }
    }
})();
