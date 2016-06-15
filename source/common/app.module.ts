/// <reference path="../../typings/angularjs/angular.d.ts" />
module App {


    export class module {
        private static templates: {[url: string]: string;} = {};
        public static register = angular
            .module("angularPOC", []);
            
        public static getTemplate(url: string) {
            return module.templates[url];
        }
    }
}
