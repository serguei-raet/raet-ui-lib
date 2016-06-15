/// <reference path="../../common/app.module.ts" />
module App.Controls.Textarea {
    export function TextareaDirective() {
        return {
            restrict: 'A',
            template: module.getTemplate('controls\textarea\textarea.template.js'),
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