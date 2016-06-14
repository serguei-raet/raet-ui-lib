/// <reference path="../../common/app.module.ts" />
module App.Controls.Textarea {
    export function TextareaDirective() {
        return {
            restrict: 'A',
            templateUrl: '/dist/controls/textarea/translations/textarea.template.en.html',
            transclude: true,
            scope: {
                ngModel: "=",
                label: "@",
                max: "=",
                rows: "="
            }
        };
    }
    module.register.directive('yfoTextarea', TextareaDirective);
}