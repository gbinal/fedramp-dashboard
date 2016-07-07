(function () {
    'use strict';

    angular
        .module('fedramp.components')
        .component('grid', {
            controller: Grid,
            controllerAs: 'gridController',
            bindings: {
                items: '=',
                rawItems: '<'
            }
        });

    Grid.$inject = ['$log', '$filter'];

    /**
     * @constructor
     * @memberof Components
     */
    function Grid ($log, $filter) {
        var self = this;

        // Maintains a list of filters
        var filters = [];

        self.addFilter = addFilter;
        self.doFilter = doFilter;
        self.clearFilters = clearFilters;
        
        /**
         * Iterates through all the results obtained from all child grid filters and
         * executes all filter funcs to reduce the data to a single dataset
         *
         * To describe somewhat visually, imagine if we have two filters
         *
         * <grid-filter property="agency"></grid-filter>
         * <grid-filter property="deploymentModel"></grid-filter>
         *
         * Agency may result with a data set containing {1, 2, 3, 4} 
         * while
         * DeploymentModel may contain a dataset with {a,b,c}
         *
         * However, if we apply the filterfunc from each filter to every single data point,
         * we may end up with {1,2,a,c}
         */
        function doFilter(){
            var combinedFilterResults = [];

            // Iterate through each filter and retrieve the data it has individually filtered
            filters.forEach(function(filter){
                combinedFilterResults = combinedFilterResults.concat(filter.filtered);
            });

            // Remove duplicates
            combinedFilterResults = Array.from(new Set(combinedFilterResults));


            var filtered = null;
            // Iterate through each filter to extract what it has found
            filters.forEach(function(filter){

                // If the current filter has no data, skip it
                if(filter.filtered.length === 0){
                    return;
                }
                combinedFilterResults = $filter('filter')(combinedFilterResults, filter.filterFunc);
            });

            self.items = combinedFilterResults;
        }

        function clearFilters(){
            filters.forEach(function(filter){
                filter.clear();
            });
        }

        /**
         * When first loading, all child grid-filter components will call this method to add
         * themselves to thos controller.
         */
        function addFilter(filter){
            filters.push(filter);
        }
    }

})();